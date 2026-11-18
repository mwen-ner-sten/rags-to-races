import Image from "next/image";
import course from "../../rally-course.json";

const lengths = course.map(([x, y], i) => i === 0 ? 0 : Math.hypot((x - course[i - 1][0]) * 2.4, y - course[i - 1][1]));
const total = lengths.reduce((a, b) => a + b, 0);
function marker(progress: number) {
  let remaining = progress * total;
  for (let i = 1; i < course.length; i++) {
    if (remaining <= lengths[i]) {
      const f = remaining / lengths[i];
      return course[i - 1].map((start, axis) => start + (course[i][axis] - start) * f);
    }
    remaining -= lengths[i];
  }
  return course[course.length - 1];
}

export function RallyStage({ progress, label }: { progress: number; label: string }) {
  const [x, y] = marker(progress);
  return <div className="rally-stage" role="img" aria-label={label}>
    <Image src="/sprites/circuits/forest-stage.webp" width={1152} height={480} alt="" />
    <span className="rally-marker" style={{ left: `${x}%`, top: `${y}%` }} />
  </div>;
}
