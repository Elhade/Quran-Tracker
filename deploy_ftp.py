#!/usr/bin/env python3
"""Deploy the Next.js static export (out/) to the server via FTPS explicit."""
import ftplib
import os
import sys

HOST = 'qurantracker.ghost-service.fr'
PORT = 21
USER = 'moussy13@qurantracker.ghost-service.fr'
PASS = 'azertyuiop13015.'
LOCAL_DIR = os.path.join(os.path.dirname(__file__), 'out')


def connect():
    ftp = ftplib.FTP_TLS()
    ftp.connect(HOST, PORT, timeout=30)
    ftp.login(USER, PASS)
    ftp.prot_p()
    ftp.set_pasv(True)
    return ftp


def ensure_dir(ftp, path):
    parts = [p for p in path.split('/') if p]
    for i, part in enumerate(parts):
        sub = '/' + '/'.join(parts[:i+1])
        try:
            ftp.mkd(sub)
        except ftplib.error_perm:
            pass  # already exists


def upload_dir(ftp, local_path, remote_path):
    total = 0
    for root, dirs, files in os.walk(local_path):
        rel = os.path.relpath(root, local_path).replace('\\', '/')
        if rel == '.':
            remote_dir = remote_path
        else:
            remote_dir = remote_path + '/' + rel

        ensure_dir(ftp, remote_dir)

        for filename in files:
            local_file = os.path.join(root, filename)
            remote_file = remote_dir + '/' + filename
            with open(local_file, 'rb') as f:
                ftp.storbinary(f'STOR {remote_file}', f)
            total += 1
            if total % 20 == 0:
                print(f'  Uploaded {total} files...', flush=True)

    return total


def main():
    if not os.path.isdir(LOCAL_DIR):
        print(f'ERROR: {LOCAL_DIR} not found. Run npm run build first.')
        sys.exit(1)

    print(f'Connecting to {HOST}:{PORT}...')
    ftp = connect()
    print('Connected and authenticated.')

    # List current remote root
    print('Remote root:')
    ftp.retrlines('LIST')

    print(f'\nUploading {LOCAL_DIR} → / ...')
    count = upload_dir(ftp, LOCAL_DIR, '')
    print(f'\nDone! Uploaded {count} files.')
    ftp.quit()


if __name__ == '__main__':
    main()
