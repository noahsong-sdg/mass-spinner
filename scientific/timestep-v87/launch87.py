"""Canonical fresh-run entry point; never replace existing V87 evidence."""
import study87


def require_fresh(directory):
    if directory.exists() and (not directory.is_dir() or any(directory.iterdir())):
        raise FileExistsError('Preserve existing evidence; use a fresh isolated source copy')


def main():
    require_fresh(study87.HERE/'results')
    return study87.main()


if __name__=='__main__': raise SystemExit(main())
