"""Guest-only signed official ARM64 binary feasibility pilot; no apt install."""
import base64
import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path.cwd(); OUT=ROOT/'evidence'; CACHE=ROOT/'downloads'; PREFIX=ROOT/'tools'
for directory in (OUT,CACHE,PREFIX): directory.mkdir(exist_ok=True)
BASE='https://dl.openfoam.org/ubuntu/'
RECEIPT={'role':'upstream installation smoke only; no physics validation','downloads':{}}


def digest(raw): return hashlib.sha256(raw).hexdigest()


def command(args,name,check=True,env=None):
    result=subprocess.run(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env)
    (OUT/(name+'.log')).write_text(result.stdout)
    RECEIPT[name]={'command':args,'exitCode':result.returncode}
    print(name,result.returncode,result.stdout[-3000:],flush=True)
    if check and result.returncode: raise RuntimeError(name+' failed')
    return result.stdout


def fetch(url,name):
    path=CACHE/name
    command(['curl','-fL','--retry','2','--connect-timeout','20','-o',str(path),url],'download-'+name)
    RECEIPT['downloads'][name]={'url':url,'sha256':digest(path.read_bytes()),'bytes':path.stat().st_size}
    return path


def main():
    command(['sh','-c','uname -a; cat /etc/os-release; ldd --version; df -h .; id'],'environment')
    key=fetch('https://dl.openfoam.org/gpg.key','foundation.asc')
    lines=key.read_text().splitlines(); body=[]; collecting=False
    for line in lines:
        if line=='': collecting=True; continue
        if collecting and not line.startswith(('=','-----')): body.append(line)
    keyring=CACHE/'foundation.gpg'; keyring.write_bytes(base64.b64decode(''.join(body)))
    release=fetch(BASE+'dists/jammy/Release','Release')
    signature=fetch(BASE+'dists/jammy/Release.gpg','Release.gpg')
    command(['gpgv','--status-fd','1','--keyring',str(keyring),str(signature),str(release)],'repository-signature')
    packages=fetch(BASE+'dists/jammy/main/binary-arm64/Packages','Packages')
    sha_section=release.read_text().split('SHA256:\n',1)[1].split('\nSHA',1)[0]
    expected=next(line.split()[0] for line in sha_section.splitlines()
                  if len(line.split())==3 and line.split()[2]=='main/binary-arm64/Packages')
    if digest(packages.read_bytes())!=expected: raise ValueError('Package index SHA256 differs from signed Release')
    candidates=[]
    for stanza in packages.read_text().split('\n\n'):
        fields=dict(line.split(': ',1) for line in stanza.splitlines() if ': ' in line and not line.startswith(' '))
        if fields.get('Package')=='openfoam14' and fields.get('Architecture')=='arm64': candidates.append(fields)
    selected=max(candidates,key=lambda p:p['Version']); RECEIPT['officialPackage']=selected
    package=fetch(BASE+selected['Filename'],'openfoam14.deb')
    if digest(package.read_bytes())!=selected['SHA256']: raise ValueError('Official package checksum differs')
    command(['dpkg-deb','-x',str(package),str(PREFIX)],'extract-rootless')
    command(['sh','-c',f'find "{PREFIX}" -name foamRun -o -name blockMesh -o -path "*/etc/bashrc"'],'installed-paths')
    bins=list(PREFIX.rglob('foamRun'))
    for index,path in enumerate(bins):
        command(['ldd',str(path)],'elf-dependencies-'+str(index),check=False)
    RECEIPT['status']='authenticated package extracted; inspect dependency logs before execution'


if __name__=='__main__':
    try: main()
    except Exception as error:
        RECEIPT['error']=type(error).__name__+': '+str(error)
        raise
    finally: (OUT/'receipt.json').write_text(json.dumps(RECEIPT,indent=2)+'\n')
