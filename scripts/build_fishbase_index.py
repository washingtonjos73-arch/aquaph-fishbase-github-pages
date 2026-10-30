
"""Build a small static species index from FishBase and SeaLifeBase Parquet snapshots.
The browser never downloads the full tables. pH ranges are NOT sourced from these tables.
"""
import json
from pathlib import Path
from datetime import datetime, timezone

import duckdb

OUT = Path("data")
OUT.mkdir(exist_ok=True)

# Source Cooperative: FishBase and SeaLifeBase have independent versions.
SOURCES = {
    "fishbase": (
        "https://data.source.coop/cboettig/fishbase/"
        "fb/v26.06/parquet/species.parquet"
    ),
    "sealifebase": (
        "https://data.source.coop/cboettig/fishbase/"
        "slb/v26.04/parquet/species.parquet"
    ),
}


def load_species(server, url):
    con = duckdb.connect(
        config={"httpfs_client_implementation": "httplib"}
    )

    try:
        con.execute("INSTALL httpfs")
        con.execute("LOAD httpfs")

        # Discover available columns.
        cols = [
            row[0]
            for row in con.execute(
                f"DESCRIBE SELECT * FROM read_parquet('{url}')"
            ).fetchall()
        ]

        lookup = {name.lower(): name for name in cols}

        def col(*names):
            return next(
                (lookup[name.lower()] for name in names
                 if name.lower() in lookup),
                None
            )

        scientific = col("ScientificName", "SpeciesName")
        genus = col("Genus")
        species = col("Species")
        common = col("FBname", "CommonName", "EnglishName")
        spec_code = col("SpecCode")
        fresh = col("Fresh", "Freshwater")
        salt = col("Salt", "Saltwater")
        brack = col("Brack", "Brackish")

        if not scientific and not (genus and species):
            raise RuntimeError(
                f"Scientific-name columns not found in {server}. "
                f"Available columns: {cols}"
            )

        def quote(name):
            return '"' + name.replace('"', '""') + '"'

        sci_expr = (
            quote(scientific)
            if scientific
            else f"concat({quote(genus)}, ' ', {quote(species)})"
        )

        common_expr = quote(common) if common else "NULL"
        code_expr = quote(spec_code) if spec_code else "NULL"
        fresh_expr = quote(fresh) if fresh else "NULL"
        salt_expr = quote(salt) if salt else "NULL"
        brack_expr = quote(brack) if brack else "NULL"

        query = f"""
            SELECT
                {sci_expr} AS scientificName,
                {common_expr} AS commonName,
                {code_expr} AS specCode,
                {fresh_expr} AS fresh,
                {salt_expr} AS salt,
                {brack_expr} AS brackish
            FROM read_parquet('{url}')
            WHERE {sci_expr} IS NOT NULL
        """

        rows = con.execute(query).fetchall()

    finally:
        con.close()

    result = []

    def is_true(value):
        return str(value).strip().lower() in (
            "yes", "true", "1", "y"
        ) if value is not None else False

    for sci, common_name, code, freshwater, saltwater, brackish in rows:
        sci = str(sci).strip() if sci else ""

        if not sci:
            continue

        result.append({
            "scientificName": sci,
            "commonName": (
                str(common_name).strip() if common_name else ""
            ),
            "specCode": code,
            "freshwater": is_true(freshwater),
            "saltwater": is_true(saltwater),
            "brackish": is_true(brackish),
            "source": (
                "FishBase" if server == "fishbase" else "SeaLifeBase"
            )
        })

    return result


all_species = []

for server, url in SOURCES.items():
    try:
        rows = load_species(server, url)
        all_species.extend(rows)
        print(f"{server}: {len(rows)} species")

    except Exception as exc:
        print(f"Warning: could not load {server}: {exc}")


# Remove duplicate scientific names, preferring FishBase records.
by_name = {}

for row in all_species:
    key = row["scientificName"].casefold()

    if key not in by_name or (
        not by_name[key]["commonName"] and row["commonName"]
    ):
        by_name[key] = row


if not by_name:
    raise SystemExit(
        "No species data retrieved; refusing to publish an empty index"
    )


path = OUT / "fishbase-index.json"

data = {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "count": len(by_name),
    "species": list(by_name.values())
}

path.write_text(
    json.dumps(data, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8"
)

print(f"Wrote {path} with {len(by_name)} records")
