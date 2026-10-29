"""Build a small static species index from FishBase and SeaLifeBase Parquet snapshots.
The browser never downloads the full tables. pH ranges are NOT sourced from these tables.
"""
import json
from pathlib import Path
import duckdb

OUT = Path("data")
OUT.mkdir(exist_ok=True)

# Columns vary slightly between snapshots; discover the schema before selecting fields.
def load_species(server):
    url = f"https://fishbase.ropensci.org/{server}/species.parquet"
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute("INSTALL parquet; LOAD parquet;")
    # Describe schema without downloading the full table into Python.
    cols = [r[0] for r in con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [url]).fetchall()]
    lookup = {c.lower(): c for c in cols}
    def col(*names):
        return next((lookup[n.lower()] for n in names if n.lower() in lookup), None)
    scientific = col("ScientificName", "SpeciesName")
    genus = col("Genus")
    species = col("Species")
    common = col("FBname", "CommonName", "EnglishName")
    spec_code = col("SpecCode")
    fresh = col("Fresh")
    salt = col("Salt")
    brack = col("Brack")
    if not scientific and not (genus and species):
        print(f"No recognizable scientific-name columns for {server}; skipping")
        return []
    # Quote column names safely and normalize common-name blanks.
    q = lambda c: '"' + c.replace('"','""') + '"'
    sci_expr = q(scientific) if scientific else f"concat({q(genus)}, ' ', {q(species)})"
    common_expr = q(common) if common else "NULL"
    fields = [f"{sci_expr} AS scientificName", f"{common_expr} AS commonName"]
    fields.append(f"{q(spec_code)} AS specCode" if spec_code else "NULL AS specCode")
    fields.append(f"{q(fresh)} AS fresh" if fresh else "NULL AS fresh")
    fields.append(f"{q(salt)} AS salt" if salt else "NULL AS salt")
    fields.append(f"{q(brack)} AS brackish" if brack else "NULL AS brackish")
    query = f"SELECT {', '.join(fields)} FROM read_parquet(?) WHERE {sci_expr} IS NOT NULL"
    rows = con.execute(query, [url]).fetchall()
    con.close()
    result=[]
    for sci, common_name, code, freshwater, saltwater, brackish in rows:
        sci = str(sci).strip() if sci else ""
        if not sci: continue
        result.append({"scientificName": sci, "commonName": str(common_name).strip() if common_name else "", "specCode": code,
                       "freshwater": str(freshwater).strip().lower() in ("yes", "true", "1", "y"),
                       "saltwater": str(saltwater).strip().lower() in ("yes", "true", "1", "y"),
                       "brackish": str(brackish).strip().lower() in ("yes", "true", "1", "y"),
                       "source": "FishBase" if server == "fishbase" else "SeaLifeBase"})
    return result

all_species=[]
for server in ("fishbase", "sealifebase"):
    try:
        rows=load_species(server)
        all_species.extend(rows)
        print(f"{server}: {len(rows)} species")
    except Exception as exc:
        print(f"Warning: could not load {server}: {exc}")

# Remove duplicate scientific names, preferring FishBase records.
by_name={}
for row in all_species:
    key=row["scientificName"].casefold()
    if key not in by_name or (not by_name[key]["commonName"] and row["commonName"]):
        by_name[key]=row
if not by_name:
    raise SystemExit("No species data retrieved; refusing to publish an empty index")
path=OUT/"fishbase-index.json"
path.write_text(json.dumps({"generatedAt": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(), "count":len(by_name), "species":list(by_name.values())}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {path} with {len(by_name)} records")
