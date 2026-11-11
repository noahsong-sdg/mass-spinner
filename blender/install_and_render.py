"""Run ONLY inside safe-dev with --online.

Installs Debian's native-architecture Blender into project-local .tools, without
root, sudo, image changes or a host Blender install. apt verifies repository
metadata/package hashes; dpkg-deb only extracts packages (no maintainer scripts).
The Debian version may be older than upstream; the asset recipe uses basic APIs.
"""
import os
import pwd
from pathlib import Path
import subprocess

project = Path.cwd()
prefix = project / '.tools' / 'blender'
apt = project / '.tools' / 'apt'
for relative in ('lists/partial', 'archives/partial'):
    (apt / relative).mkdir(parents=True, exist_ok=True)
options = ['-o', f'Dir::State::lists={apt / "lists"}',
           '-o', f'Dir::Cache::archives={apt / "archives"}',
           '-o', 'Debug::NoLocking=true', '-o', f'APT::Sandbox::User={pwd.getpwuid(os.getuid()).pw_name}']
subprocess.run(['apt-get', *options, 'update'], check=True)
subprocess.run(['apt-get', *options, '--download-only', '--no-install-recommends',
                '-y', 'install', 'blender'], check=True)
prefix.mkdir(parents=True, exist_ok=True)
for package in sorted((apt / 'archives').glob('*.deb')):
    subprocess.run(['dpkg-deb', '--extract', str(package), str(prefix)], check=True)
library = prefix / 'usr' / 'lib'
triplet = subprocess.check_output(['gcc', '-dumpmachine'], text=True).strip()
env = dict(os.environ)
env['LD_LIBRARY_PATH'] = ':'.join(str(p) for p in (library / triplet, library / 'blender', library))
env['BLENDER_SYSTEM_SCRIPTS'] = str(prefix / 'usr/share/blender/scripts')
env['BLENDER_SYSTEM_DATAFILES'] = str(prefix / 'usr/share/blender/datafiles')
binary = prefix / 'usr/bin/blender'
subprocess.run([str(binary), '--version'], env=env, check=True)
subprocess.run([str(binary), '--background', '--factory-startup', '--python-exit-code', '1',
                '--python', 'blender/build_separator.py'], env=env, check=True)
