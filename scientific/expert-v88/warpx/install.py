"""Replay the previously verified exact conda distributions in safe-dev only."""
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.request

home = Path('/work/home')
tools = home/'warpx88-tools'
tools.mkdir(exist_ok=True)
archive = tools/'micromamba.tar.bz2'
urllib.request.urlretrieve('https://micro.mamba.pm/api/micromamba/linux-aarch64/2.10.0', archive)
subprocess.run(['tar', '-xjf', str(archive), '-C', str(tools), 'bin/micromamba'], check=True)
old = json.loads(Path('previous-installation.json').read_bytes())
lock = Path('explicit-linux.lock')
lock.write_text('@EXPLICIT\n'+'\n'.join(p['url']+'#'+p['sha256'] for p in old['packages'])+'\n')
command = [str(tools/'bin/micromamba'), 'create', '-y', '-r', str(home/'warpx88-mamba'),
           '-p', str(home/'warpx88-env'), '--file', str(lock)]
subprocess.run(command, check=True)
packages = json.loads(subprocess.check_output([str(tools/'bin/micromamba'), 'list',
                                              '-p', str(home/'warpx88-env'), '--json']))
Path('installation.json').write_text(json.dumps(dict(micromambaSHA256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                                                   command=command, packages=packages), indent=2)+'\n')
