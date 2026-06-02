import { abs, clamp, dot, exp2, float, max } from 'three/tsl'

export function computeVbaoBilateralGeometryWeight(
  centerPosition: any,
  centerNormal: any,
  tapPosition: any,
  tapNormal: any,
  radiusNode: any,
  label: string,
): any {
  const normalAgreement = clamp(dot(centerNormal, tapNormal), float(0), float(1))
  const planeDistance = abs(dot(tapPosition.sub(centerPosition), centerNormal)).toVar(
    `${label}PlaneDistance`,
  )
  const depthWeight = exp2(
    planeDistance.negate().mul(float(24)).div(max(float(radiusNode), float(1e-3))),
  )
  const normal2 = normalAgreement.mul(normalAgreement).toVar(`${label}Normal2`)
  const normal4 = normal2.mul(normal2).toVar(`${label}Normal4`)
  const normalWeight = normal4.mul(normal4).toVar(`${label}NormalWeight`)

  return depthWeight.mul(normalWeight).toVar(`${label}GeometryWeight`)
}
