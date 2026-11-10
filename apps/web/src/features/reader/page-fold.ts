type Point = { x: number; y: number };

export function pageFold(
  width: number,
  height: number,
  distance: number,
  lift: number,
  previous: boolean,
) {
  const dx = Math.max(1, distance);
  const dy = Math.min(height * 0.55, Math.max(-height * 0.16, lift));
  const length = Math.hypot(dx, dy);
  const normal = { x: dx / length, y: dy / length };
  const center = { x: width - dx / 2, y: height - dy / 2 };
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const signed = (p: Point) =>
    (p.x - center.x) * normal.x + (p.y - center.y) * normal.y;
  const reflect = (p: Point) => ({
    x: p.x - 2 * signed(p) * normal.x,
    y: p.y - 2 * signed(p) * normal.y,
  });
  const flat: Point[] = [];
  const folded: Point[] = [];

  for (const [i, corner] of corners.entries()) {
    const next = corners[(i + 1) % corners.length];
    const a = signed(corner);
    const b = signed(next);
    (a > 0 ? folded : flat).push(corner);
    if (a > 0 !== b > 0) {
      const t = a / (a - b);
      const seam = {
        x: corner.x + (next.x - corner.x) * t,
        y: corner.y + (next.y - corner.y) * t,
      };
      flat.push(seam);
      folded.push(seam);
    }
  }

  const point = (p: Point, shift = 0) =>
    `${(shift + (previous ? width - p.x : p.x)).toFixed(2)} ${p.y.toFixed(2)}`;
  const flatPath = flat.length
    ? `M${flat.map((p) => point(p)).join("L")}Z`
    : "M0 0Z";
  const curl =
    Math.min(24, length * 0.16) *
    Math.sin(Math.PI * Math.min(1, dx / (2 * width)));
  const sheetPath = (shift: number) => {
    const outline = folded.map(reflect);
    if (!outline.length) return "M0 0Z";
    let path = `M${point(outline[0], shift)}`;
    for (const [i, start] of outline.entries()) {
      const j = (i + 1) % outline.length;
      const end = outline[j];
      if (
        Math.abs(signed(folded[i])) < 0.01 &&
        Math.abs(signed(folded[j])) < 0.01
      ) {
        path += `L${point(end, shift)}`;
      } else {
        const bend = Math.min(
          curl,
          Math.hypot(end.x - start.x, end.y - start.y) * 0.25,
        );
        const control = {
          x: (start.x + end.x) / 2 - normal.x * bend,
          y: (start.y + end.y) / 2 - normal.y * bend,
        };
        path += `Q${point(control, shift)} ${point(end, shift)}`;
      }
    }
    return `${path}Z`;
  };

  const crease = { x: previous ? width - center.x : center.x, y: center.y };
  const nx = previous ? -normal.x : normal.x;
  const ny = normal.y;
  const xy = -2 * nx * ny;
  const originDistance = (width - crease.x) * nx - crease.y * ny;

  function backTransform(shift: number) {
    // The reverse side starts mirrored at the outer edge. Reflecting it across
    // the crease puts its text in reading order as the leaf lands.
    return `matrix(${[
      2 * nx * nx - 1,
      -xy,
      xy,
      1 - 2 * ny * ny,
      shift + width - 2 * originDistance * nx,
      -2 * originDistance * ny,
    ]
      .map((value) => value.toFixed(5))
      .join(",")})`;
  }

  return {
    flatPath,
    sheetPath,
    backTransform,
    crease,
    tip: { x: previous ? dx : width - dx, y: height - dy },
    shade: Math.min(1, (1 - dx / (2 * width)) * 5),
  };
}
