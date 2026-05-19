import os
import sys
import glob
from sqlalchemy import text

# Add the catalogue root to path so db.postgres is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db.postgres import engine

def run_migrations():
    migration_dir = os.path.dirname(__file__)
    sql_files = sorted(glob.glob(os.path.join(migration_dir, "*.sql")))
    
    with engine.connect() as conn:
        for filepath in sql_files:
            filename = os.path.basename(filepath)
            print(f"Running {filename}...")
            with open(filepath) as f:
                sql = f.read()
            conn.execute(text(sql))
            conn.commit()
            print(f"✓ {filename} done")

if __name__ == "__main__":
    run_migrations()
