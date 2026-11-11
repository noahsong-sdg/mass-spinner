"""Use only the preserved safe-dev v28 Linux Blender cache; no host Blender."""
import os
from pathlib import Path
import subprocess
import sys

root = Path('/work/home/blender-v28')
binary = root / 'usr/bin/blender'
if not binary.is_file():
    raise FileNotFoundError('The reviewed safe-dev Blender cache is required.')
env = {**os.environ,
       'LD_LIBRARY_PATH': ':'.join(sorted({str(p.parent) for p in root.rglob('*.so*')})),
       'BLENDER_SYSTEM_SCRIPTS': str(root / 'usr/share/blender/scripts'),
       'BLENDER_SYSTEM_DATAFILES': str(root / 'usr/share/blender/datafiles'),
       'PYTHONPATH': '/work/home/blender-python-v28'}
command = [str(binary), '-b', '--threads', '4', '--python-use-system-env',
           '--python-exit-code', '1', '--python', 'render_engineering.py',
           '--', *sys.argv[1:]]
with Path('render-engineering.log').open('a') as log:
    log.write(f'COMMAND {command!r}\n')
    process = subprocess.Popen(command, env=env, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        log.write(line)
        if any(marker in line for marker in ['ENGINEERING_RENDER', 'Saved:', 'Traceback', 'Error:']):
            print(line.rstrip(), flush=True)
    code = process.wait()
    if code:
        raise subprocess.CalledProcessError(code, command)
