"""Exercise the actual Actions credential guard without invoking Wrangler."""
import os
from pathlib import Path
import subprocess
import textwrap
import unittest


class DeployCredentialGuard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        workflow = (Path(__file__).resolve().parents[1] / '.github/workflows/deploy.yml').read_text()
        step = workflow.split('      - name: Deploy admitted artifact with project-pinned Wrangler\n', 1)[1].split('\n      - ', 1)[0]
        commands = textwrap.dedent(step.split('        run: |\n', 1)[1]).strip().splitlines()
        vendor = [line for line in commands if line.startswith('docker run ') and line.endswith('node_modules/.bin/wrangler deploy')]
        if len(vendor) != 1:
            raise AssertionError('Expected exactly one isolated Wrangler deployment command')
        cls.guard = '\n'.join('printf deployment-reached' if line == vendor[0] else line for line in commands)

    def run_guard(self, credentials, guard=None):
        return subprocess.run(['bash', '-e', '-c', self.guard if guard is None else guard],
                              env={'PATH': os.defpath, **credentials}, capture_output=True, text=True, timeout=5)

    def test_absent_empty_and_partial_credentials_stop_before_deployment(self):
        for credentials in [{}, {'CLOUDFLARE_API_TOKEN': '', 'CLOUDFLARE_ACCOUNT_ID': ''},
                            {'CLOUDFLARE_API_TOKEN': 'test-token'}, {'CLOUDFLARE_ACCOUNT_ID': 'test-account'},
                            {'CLOUDFLARE_API_TOKEN': '', 'CLOUDFLARE_ACCOUNT_ID': 'test-account'},
                            {'CLOUDFLARE_API_TOKEN': 'test-token', 'CLOUDFLARE_ACCOUNT_ID': ''}]:
            with self.subTest(credentials=credentials):
                result = self.run_guard(credentials)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, '')

    def test_both_credentials_reach_deployment(self):
        result = self.run_guard({'CLOUDFLARE_API_TOKEN': 'test-token', 'CLOUDFLARE_ACCOUNT_ID': 'test-account'})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, 'deployment-reached')

    def test_old_and_list_demonstrates_missing_token_bypass(self):
        old = self.guard.replace('test -n "$CLOUDFLARE_API_TOKEN"\ntest -n "$CLOUDFLARE_ACCOUNT_ID"',
                                 'test -n "$CLOUDFLARE_API_TOKEN" && test -n "$CLOUDFLARE_ACCOUNT_ID"')
        self.assertNotEqual(old, self.guard)
        self.assertEqual(self.run_guard({}, old).stdout, 'deployment-reached')
