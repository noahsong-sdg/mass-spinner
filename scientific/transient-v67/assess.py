"""Bind explicit comparisons to exported bytes and run both independent audits."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

packet = Path(sys.argv[1]); raw = packet.read_bytes(); data = json.loads(raw)
folder = Path(sys.argv[2]); folder.mkdir(exist_ok=False)
pairs = [{'coarseID': a, 'fineID': b, 'axis': axis} for a, b, axis in json.loads(sys.argv[3])]
config = {'sourceSHA256': data['sourceSHA256'], 'predictionSHA256': hashlib.sha256(raw).hexdigest(), 'pairs': pairs}
(folder/'config.json').write_text(json.dumps(config, indent=2)+'\n')
receipts = []
for label, command in [
    ('refinement', [sys.executable, 'scientific/transient-v67/analyze.py', str(packet), str(folder/'config.json'), str(folder/'analysis.json')]),
    ('conservation', [sys.executable, 'scientific/current-v66/check_coupled.py', str(packet), str(folder/'audit.json')]),
]:
    result = subprocess.run(command, capture_output=True, text=True, timeout=600)
    (folder/(label+'.log')).write_text(result.stdout+'\n'+result.stderr)
    receipts.append({'label': label, 'command': command, 'exitCode': result.returncode})
    print(label, result.returncode, result.stdout[-800:], result.stderr[-1000:], flush=True)
(folder/'receipts.json').write_text(json.dumps(receipts, indent=2)+'\n')
raise SystemExit(0 if all(r['exitCode'] == 0 for r in receipts) else 1)
