#!/usr/bin/env node
import http from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchBenchmarkBrowser } from './profiling/benchmarkHarness.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const outputJson = path.join(artifactRoot, 'ao-gpu-readback-latest.json')
const outputMd = path.join(artifactRoot, 'ao-gpu-readback-summary.md')
const sectorCount = 32
const thetaMin = -Math.PI / 2
const thetaMax = Math.PI / 2
const browserChannel = process.env.AO_GPU_READBACK_BROWSER_CHANNEL ?? 'chrome'
const headless = process.env.AO_GPU_READBACK_HEADED !== '1'

const fixtures = [
  {
    id: 'flat-plane-open',
    intervals: [],
    description: 'No above-surface occluder; AO should remain open.',
  },
  {
    id: 'full-hemisphere-blocker',
    intervals: [[thetaMin, thetaMax]],
    description: 'Entire visible hemislice blocked; AO should be dark.',
  },
  {
    id: 'two-wall-corner-gap',
    intervals: [[-1.2, -0.2], [0.2, 1.2]],
    description: 'Two broad wall lobes with a center opening.',
  },
  {
    id: 'thin-pole',
    intervals: [[-0.06, 0.06]],
    description: 'Single finite thin occluder; should not become a fat halo.',
  },
  {
    id: 'thin-fence-separated',
    intervals: [[-0.75, -0.68], [-0.2, -0.13], [0.23, 0.3], [0.7, 0.77]],
    description: 'Several separated thin occluders; bitmask should preserve gaps.',
  },
  {
    id: 'grazing-wall-side',
    intervals: [[0.95, 1.35]],
    description: 'One grazing-side occluder; tests false broad darkening.',
  },
]

function clampTheta(value) {
  return Math.max(thetaMin, Math.min(thetaMax, value))
}

function cosineCdf(theta) {
  return 0.5 * (Math.sin(clampTheta(theta)) + 1)
}

function normalizedIntervals(intervals) {
  return intervals
    .map(([a, b]) => [Math.min(clampTheta(a), clampTheta(b)), Math.max(clampTheta(a), clampTheta(b))])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
}

function referenceAccessibility(intervals) {
  const measure = normalizedIntervals(intervals).reduce((sum, [a, b]) => sum + cosineCdf(b) - cosineCdf(a), 0)
  return Math.max(0, Math.min(1, 1 - measure))
}

function vbaoAccessibility(intervals) {
  const bits = new Set()
  for (const [a, b] of normalizedIntervals(intervals)) {
    const u0 = cosineCdf(a)
    const u1 = cosineCdf(b)
    const first = Math.ceil(Math.min(u0, u1) * sectorCount - 0.5)
    const last = Math.floor(Math.max(u0, u1) * sectorCount - 0.5)
    for (let k = Math.max(0, first); k <= Math.min(sectorCount - 1, last); k++) bits.add(k)
  }
  return 1 - bits.size / sectorCount
}

function horizonEnvelopeAccessibility(intervals) {
  const normalized = normalizedIntervals(intervals)
  if (normalized.length === 0) return 1
  return referenceAccessibility([[normalized[0][0], normalized.at(-1)[1]]])
}

function ssaoUniformSampleAccessibility(intervals) {
  const normalized = normalizedIntervals(intervals)
  if (normalized.length === 0) return 1

  let occluded = 0
  for (let i = 0; i < sectorCount; i++) {
    const theta = thetaMin + ((i + 0.5) / sectorCount) * Math.PI
    if (normalized.some(([a, b]) => theta >= a && theta <= b)) occluded++
  }

  return 1 - occluded / sectorCount
}

function escapeMarkdownTableCell(value) {
  return String(value).replaceAll('|', '\\|')
}

function serveBlankPage() {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    })
    response.end('<!doctype html><meta charset="utf-8"><title>AO GPU readback baseline</title>')
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') reject(new Error('Failed to bind local readback server'))
      else resolve({ server, url: `http://127.0.0.1:${address.port}/` })
    })
  })
}

const shaderSource = /* wgsl */ `
const PI: f32 = 3.141592653589793;
const THETA_MIN: f32 = -0.5 * PI;
const THETA_MAX: f32 = 0.5 * PI;
const SECTOR_COUNT: f32 = 32.0;
const FIXTURE_COUNT: u32 = 6u;
const MAX_INTERVALS: u32 = 4u;

struct Output {
  values: array<f32>,
};

@group(0) @binding(0) var<storage, read_write> output: Output;

fn clamp_theta(value: f32) -> f32 {
  return clamp(value, THETA_MIN, THETA_MAX);
}

fn cosine_cdf(theta: f32) -> f32 {
  return 0.5 * (sin(clamp_theta(theta)) + 1.0);
}

fn interval_count(fixture: u32) -> u32 {
  if (fixture == 0u) { return 0u; }
  if (fixture == 1u) { return 1u; }
  if (fixture == 2u) { return 2u; }
  if (fixture == 3u) { return 1u; }
  if (fixture == 4u) { return 4u; }
  return 1u;
}

fn interval_pair(fixture: u32, interval: u32) -> vec2<f32> {
  if (fixture == 1u) { return vec2<f32>(THETA_MIN, THETA_MAX); }
  if (fixture == 2u && interval == 0u) { return vec2<f32>(-1.2, -0.2); }
  if (fixture == 2u && interval == 1u) { return vec2<f32>(0.2, 1.2); }
  if (fixture == 3u) { return vec2<f32>(-0.06, 0.06); }
  if (fixture == 4u && interval == 0u) { return vec2<f32>(-0.75, -0.68); }
  if (fixture == 4u && interval == 1u) { return vec2<f32>(-0.2, -0.13); }
  if (fixture == 4u && interval == 2u) { return vec2<f32>(0.23, 0.3); }
  if (fixture == 4u && interval == 3u) { return vec2<f32>(0.7, 0.77); }
  if (fixture == 5u) { return vec2<f32>(0.95, 1.35); }
  return vec2<f32>(0.0, 0.0);
}

fn normalized_pair(fixture: u32, interval: u32) -> vec2<f32> {
  let raw = interval_pair(fixture, interval);
  let a = clamp_theta(min(raw.x, raw.y));
  let b = clamp_theta(max(raw.x, raw.y));
  return vec2<f32>(a, b);
}

fn reference_accessibility(fixture: u32) -> f32 {
  var occluded: f32 = 0.0;
  let count = interval_count(fixture);
  for (var i = 0u; i < MAX_INTERVALS; i = i + 1u) {
    if (i < count) {
      let interval = normalized_pair(fixture, i);
      if (interval.y > interval.x) {
        occluded = occluded + cosine_cdf(interval.y) - cosine_cdf(interval.x);
      }
    }
  }
  return clamp(1.0 - occluded, 0.0, 1.0);
}

fn sector_accessibility(fixture: u32) -> f32 {
  var mask: u32 = 0u;
  let count = interval_count(fixture);
  for (var i = 0u; i < MAX_INTERVALS; i = i + 1u) {
    if (i < count) {
      let interval = normalized_pair(fixture, i);
      if (interval.y > interval.x) {
        let u0 = cosine_cdf(interval.x);
        let u1 = cosine_cdf(interval.y);
        let lo = min(u0, u1);
        let hi = max(u0, u1);
        let first = i32(ceil(lo * SECTOR_COUNT - 0.5));
        let last = i32(floor(hi * SECTOR_COUNT - 0.5));
        for (var sector = 0u; sector < 32u; sector = sector + 1u) {
          let signed_sector = i32(sector);
          if (signed_sector >= first && signed_sector <= last) {
            mask = mask | (1u << sector);
          }
        }
      }
    }
  }
  return 1.0 - f32(countOneBits(mask)) / SECTOR_COUNT;
}

fn horizon_envelope_accessibility(fixture: u32) -> f32 {
  let count = interval_count(fixture);
  if (count == 0u) {
    return 1.0;
  }
  let first = normalized_pair(fixture, 0u);
  let last = normalized_pair(fixture, count - 1u);
  let occluded = cosine_cdf(last.y) - cosine_cdf(first.x);
  return clamp(1.0 - occluded, 0.0, 1.0);
}

fn ssao_uniform_sample_accessibility(fixture: u32) -> f32 {
  let count = interval_count(fixture);
  if (count == 0u) {
    return 1.0;
  }

  var occluded: u32 = 0u;
  for (var sample = 0u; sample < 32u; sample = sample + 1u) {
    let theta = THETA_MIN + ((f32(sample) + 0.5) / SECTOR_COUNT) * PI;
    var hit = false;
    for (var interval_index = 0u; interval_index < MAX_INTERVALS; interval_index = interval_index + 1u) {
      if (interval_index < count) {
        let interval = normalized_pair(fixture, interval_index);
        if (theta >= interval.x && theta <= interval.y) {
          hit = true;
        }
      }
    }
    if (hit) {
      occluded = occluded + 1u;
    }
  }
  return 1.0 - f32(occluded) / SECTOR_COUNT;
}

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let fixture = id.x;
  if (fixture >= FIXTURE_COUNT) {
    return;
  }
  let base = fixture * 4u;
  output.values[base + 0u] = reference_accessibility(fixture);
  output.values[base + 1u] = sector_accessibility(fixture);
  output.values[base + 2u] = horizon_envelope_accessibility(fixture);
  output.values[base + 3u] = ssao_uniform_sample_accessibility(fixture);
}
`

async function collectGpuReadback(page) {
  return page.evaluate(async ({ shader, fixtureCount }) => {
    if (!('gpu' in navigator)) throw new Error('navigator.gpu is unavailable')
    const adapter = await navigator.gpu.requestAdapter()
    if (adapter === null) throw new Error('WebGPU adapter is unavailable')
    const device = await adapter.requestDevice()
    const outputByteLength = fixtureCount * 4 * Float32Array.BYTES_PER_ELEMENT
    const outputValueCount = fixtureCount * 4
    const outputBuffer = device.createBuffer({
      size: outputByteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })
    const readbackBuffer = device.createBuffer({
      size: outputByteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    const pipelineStart = performance.now()
    const module = device.createShaderModule({ code: shader })
    const pipeline = await device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    })
    const pipelineMs = performance.now() - pipelineStart
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: outputBuffer } }],
    })
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginComputePass()
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.dispatchWorkgroups(fixtureCount)
    pass.end()
    encoder.copyBufferToBuffer(outputBuffer, 0, readbackBuffer, 0, outputByteLength)
    const dispatchStart = performance.now()
    device.queue.submit([encoder.finish()])
    await device.queue.onSubmittedWorkDone()
    const dispatchMs = performance.now() - dispatchStart
    const readbackStart = performance.now()
    await readbackBuffer.mapAsync(GPUMapMode.READ)
    const values = Array.from(new Float32Array(readbackBuffer.getMappedRange()).slice())
    const readbackMs = performance.now() - readbackStart
    readbackBuffer.unmap()
    outputBuffer.destroy()
    readbackBuffer.destroy()
    return {
      adapterInfo: typeof adapter.info === 'object' ? adapter.info : null,
      webgpuBackendStatus: {
        navigatorGpu: true,
        adapter: 'available',
        device: 'available',
        backend: 'webgpu-compute',
      },
      outputResolution: {
        width: outputValueCount,
        height: 1,
        valueCount: outputValueCount,
        byteLength: outputByteLength,
      },
      computeDispatchTimings: [
        {
          pass: 'ao-fixture-readback',
          workgroups: fixtureCount,
          pipelineCreateCpuMs: pipelineMs,
          submitAndCompleteCpuMs: dispatchMs,
          mapReadCpuMs: readbackMs,
        },
      ],
      storageTargetInventory: [
        {
          name: 'output',
          role: 'storage-copy-source',
          byteLength: outputByteLength,
          usage: 'STORAGE | COPY_SRC',
        },
        {
          name: 'readback',
          role: 'map-read-copy-destination',
          byteLength: outputByteLength,
          usage: 'COPY_DST | MAP_READ',
        },
      ],
      values,
    }
  }, { shader: shaderSource, fixtureCount: fixtures.length })
}

const { server, url } = await serveBlankPage()
let browser
try {
  browser = await launchBenchmarkBrowser({
    channel: browserChannel,
    headless,
    extraArgs: ['--disable-gpu-sandbox'],
  })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const gpu = await collectGpuReadback(page)
  const rows = fixtures.map((fixture, index) => {
    const base = index * 4
    const gpuReference = gpu.values[base + 0]
    const gpuVbao = gpu.values[base + 1]
    const gpuHorizon = gpu.values[base + 2]
    const gpuSsao = gpu.values[base + 3]
    const cpuReference = referenceAccessibility(fixture.intervals)
    const cpuVbao = vbaoAccessibility(fixture.intervals)
    const cpuHorizon = horizonEnvelopeAccessibility(fixture.intervals)
    const cpuSsao = ssaoUniformSampleAccessibility(fixture.intervals)
    return {
      ...fixture,
      cpuReference,
      candidates: [
        {
          algorithm: 'vbao-32-sector-gpu',
          gpuAccessibility: gpuVbao,
          cpuAccessibility: cpuVbao,
          referenceAccessibility: cpuReference,
          absErrorVsReference: Math.abs(gpuVbao - cpuReference),
          gpuCpuDrift: Math.abs(gpuVbao - cpuVbao),
        },
        {
          algorithm: 'gtao-horizon-envelope-gpu-proxy',
          gpuAccessibility: gpuHorizon,
          cpuAccessibility: cpuHorizon,
          referenceAccessibility: cpuReference,
          absErrorVsReference: Math.abs(gpuHorizon - cpuReference),
          gpuCpuDrift: Math.abs(gpuHorizon - cpuHorizon),
        },
        {
          algorithm: 'ssao-uniform-sample-gpu-proxy',
          gpuAccessibility: gpuSsao,
          cpuAccessibility: cpuSsao,
          referenceAccessibility: cpuReference,
          absErrorVsReference: Math.abs(gpuSsao - cpuReference),
          gpuCpuDrift: Math.abs(gpuSsao - cpuSsao),
        },
        {
          algorithm: 'cosine-reference-gpu',
          gpuAccessibility: gpuReference,
          cpuAccessibility: cpuReference,
          referenceAccessibility: cpuReference,
          absErrorVsReference: Math.abs(gpuReference - cpuReference),
          gpuCpuDrift: Math.abs(gpuReference - cpuReference),
        },
      ],
    }
  })

  const algorithms = ['vbao-32-sector-gpu', 'gtao-horizon-envelope-gpu-proxy', 'ssao-uniform-sample-gpu-proxy']
  const summary = algorithms.map((algorithm) => {
    const candidates = rows.map((row) => row.candidates.find((candidate) => candidate.algorithm === algorithm))
    const errors = candidates.map((candidate) => candidate.absErrorVsReference)
    const drifts = candidates.map((candidate) => candidate.gpuCpuDrift)
    const mae = errors.reduce((sum, value) => sum + value, 0) / errors.length
    const rmse = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length)
    const maxGpuCpuDrift = Math.max(...drifts)
    const worstIndex = errors.indexOf(Math.max(...errors))
    return {
      algorithm,
      mae,
      rmse,
      maxGpuCpuDrift,
      worstFixture: rows[worstIndex].id,
      worstAbsError: errors[worstIndex],
    }
  }).sort((a, b) => a.mae - b.mae)

  const report = {
    generatedAt: new Date().toISOString(),
    backend: 'WebGPU compute readback',
    basis: 'GPU readback of pinned AO fixture kernels. Reference is cosine-weighted hemislice visibility; candidates are read from a WebGPU storage buffer via MAP_READ.',
    browserChannel,
    headless,
    sectorCount,
    adapterInfo: gpu.adapterInfo,
    webgpuBackendStatus: gpu.webgpuBackendStatus,
    outputResolution: gpu.outputResolution,
    computeDispatchTimings: gpu.computeDispatchTimings,
    storageTargetInventory: gpu.storageTargetInventory,
    rows,
    summary,
  }

  await mkdir(artifactRoot, { recursive: true })
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

  const lines = []
  lines.push('# AO GPU Readback Baseline Summary')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push('Basis: WebGPU compute readback against cosine-weighted hemislice fixture reference. Lower error is closer to the reference.')
  lines.push('')
  lines.push(`Backend status: ${report.webgpuBackendStatus.backend}; adapter ${report.webgpuBackendStatus.adapter}; device ${report.webgpuBackendStatus.device}.`)
  lines.push(`Output resolution: ${report.outputResolution.width}x${report.outputResolution.height} values (${report.outputResolution.byteLength} bytes).`)
  lines.push('')
  lines.push('| Compute pass | Workgroups | Pipeline CPU ms ↓ | Submit+complete CPU ms ↓ | Map-read CPU ms ↓ |')
  lines.push('| --- | ---: | ---: | ---: | ---: |')
  for (const item of report.computeDispatchTimings) {
    lines.push(`| ${item.pass} | ${item.workgroups} | ${item.pipelineCreateCpuMs.toFixed(3)} | ${item.submitAndCompleteCpuMs.toFixed(3)} | ${item.mapReadCpuMs.toFixed(3)} |`)
  }
  lines.push('')
  lines.push('| Storage target | Role | Bytes | Usage |')
  lines.push('| --- | --- | ---: | --- |')
  for (const item of report.storageTargetInventory) {
    lines.push(`| ${item.name} | ${item.role} | ${item.byteLength} | ${escapeMarkdownTableCell(item.usage)} |`)
  }
  lines.push('')
  lines.push('| Algorithm | MAE ↓ | RMSE ↓ | Max GPU/CPU drift ↓ | Worst fixture | Worst abs error ↓ |')
  lines.push('| --- | ---: | ---: | ---: | --- | ---: |')
  for (const item of summary) {
    lines.push(`| ${item.algorithm} | ${item.mae.toFixed(4)} | ${item.rmse.toFixed(4)} | ${item.maxGpuCpuDrift.toExponential(2)} | ${item.worstFixture} | ${item.worstAbsError.toFixed(4)} |`)
  }
  lines.push('')
  lines.push('| Fixture | Reference | VBAO GPU | VBAO err | Horizon GPU proxy | Horizon err | SSAO GPU proxy | SSAO err |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of rows) {
    const vbao = row.candidates.find((candidate) => candidate.algorithm === 'vbao-32-sector-gpu')
    const horizon = row.candidates.find((candidate) => candidate.algorithm === 'gtao-horizon-envelope-gpu-proxy')
    const ssao = row.candidates.find((candidate) => candidate.algorithm === 'ssao-uniform-sample-gpu-proxy')
    lines.push(`| ${row.id} | ${row.cpuReference.toFixed(4)} | ${vbao.gpuAccessibility.toFixed(4)} | ${vbao.absErrorVsReference.toFixed(4)} | ${horizon.gpuAccessibility.toFixed(4)} | ${horizon.absErrorVsReference.toFixed(4)} | ${ssao.gpuAccessibility.toFixed(4)} | ${ssao.absErrorVsReference.toFixed(4)} |`)
  }
  lines.push('')
  lines.push('Notes:')
  lines.push('- This is a real WebGPU buffer readback, not a screenshot capture.')
  lines.push('- It validates pinned visibility kernels/fixtures, not full Three.js VBAONode render-target pixels.')
  lines.push('- The SSAO row is a uniform binary sample-count proxy, not a renderer-specific SSAO implementation.')
  lines.push('- Use this beside FPS results: FPS measures cost; this measures estimator shape against physical visibility.')
  await writeFile(outputMd, `${lines.join('\n')}\n`)

  console.log(JSON.stringify({ outputJson, outputMd, rows: rows.length, summary }, null, 2))
} finally {
  if (browser !== undefined) await browser.close()
  server.close()
}
