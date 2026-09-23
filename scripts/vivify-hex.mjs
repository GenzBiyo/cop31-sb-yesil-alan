import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "src");
const map = [
  ["#04122C", "#0678B8"],
  ["#071E45", "#0088C8"],
  ["#082448", "#0090D0"],
  ["#0B2F6B", "#0077C2"],
  ["#2E9FDB", "#00A3E0"],
  ["#7EC8EA", "#5EC8F0"],
  ["#2E9B4A", "#32C45A"],
  ["#1B7A38", "#22A34A"],
  ["#B0141A", "#C4161D"],
  ["#F3F7FB", "#EEF8FD"],
  ["#E5EEF6", "#D8F0FA"],
  ["#C9D7E6", "#B5DFF2"],
  ["#4A6278", "#3E6A88"],
  ["#D5E6F2", "#C8EEFA"],
];

function walk(d) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(n.name)) {
      let t = fs.readFileSync(p, "utf8");
      const o = t;
      for (const [a, b] of map) t = t.split(a).join(b);
      if (t !== o) {
        fs.writeFileSync(p, t);
        console.log(path.relative(process.cwd(), p));
      }
    }
  }
}
walk(root);
