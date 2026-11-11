"""Persistent local adapter, run only in safe-dev; no runtime network."""
import json
from pathlib import Path
import subprocess
import sys


class Bridge:
    def __init__(self, setup, current_rtol=4*sys.float_info.epsilon):
        root = Path(__file__).resolve().parents[2]
        self.process = subprocess.Popen(
            [str(root/'node_modules/.bin/tsx'), str(Path(__file__).with_suffix('.ts'))],
            cwd=root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            self.call(command='setup', setup=setup, relativeTolerance=current_rtol)
        except Exception:
            self.close()
            raise

    def call(self, **request):
        self.process.stdin.write(json.dumps(request, allow_nan=False)+'\n')
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError('Scientific adapter exited without a response')
        reply = json.loads(line)
        if 'error' in reply:
            raise ValueError(reply['error'])
        return reply['result']

    def current(self, omega):
        return self.call(command='current', omega=[float(w) for w in omega])

    def props(self, gas, solid):
        return self.call(command='props', gas=[float(t) for t in gas], solid=[float(t) for t in solid])

    def close(self):
        self.process.stdin.close()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.process.stdout.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
