"""Run each lab in an isolated interpreter; duplicate module names never collide."""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
subprocess.run(["node", "scripts/check.cjs"], cwd=ROOT, check=True)
labs = sorted(path for path in (ROOT / "labs").iterdir() if list(path.glob("test_*.py")))
for lab in labs:
    subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", str(lab), "-p", "test_*.py"], cwd=ROOT, check=True)
print(f"Site checks and {len(labs)} lab suites passed.")
