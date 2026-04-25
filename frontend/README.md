# Gene Explorer

A full-stack genomics platform combining drug-gene interaction analysis and CRISPR guide RNA design. Search any human gene to explore FDA-approved drug interactions and optimal Cas9 cut sites — all in one place.

## Features

**Drug Interactions tab**
- Fetches all drug-gene interactions from DGIdb
- Shows FDA approval status and interaction score
- Filter by approved / unapproved

**CRISPR Guide RNA tab**
- Fetches real DNA sequences from NCBI Entrez
- Scans for NGG PAM sites and extracts 20bp guide RNAs
- Scores each guide by GC content, homopolymer runs, and Cas9 binding
- Results ranked by efficiency score

## Tech Stack

- Python, Flask, Biopython
- DGIdb GraphQL API (https://dgidb.org)
- NCBI Entrez API (https://www.ncbi.nlm.nih.gov)
- React

## Run Locally

**Backend**
```bash
cd backend
python3 -m venv gene
source gene/bin/activate
pip install -r requirements.txt
python3 api.py
```

**Frontend**
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000 and search any gene — BRCA1, TP53, EGFR, KRAS, FLT3.