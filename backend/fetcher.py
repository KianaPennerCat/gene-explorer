"""
fetcher.py
Fetches DNA sequences from NCBI Entrez for a given gene name.
"""

import requests
import xml.etree.ElementTree as ET

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EMAIL = "pennerkiana@gmail.com"  # NCBI requires an email for API access


def search_gene(gene_name: str, organism: str = "homo sapiens") -> str:
    """Search NCBI for a gene and return the top nucleotide ID."""
    url = f"{NCBI_BASE}/esearch.fcgi"
    params = {
        "db": "nucleotide",
        "term": f"{gene_name}[Gene Name] AND {organism}[Organism] AND mRNA[Filter]",
        "retmax": 1,
        "retmode": "json",
        "email": EMAIL,
    }
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    ids = data.get("esearchresult", {}).get("idlist", [])
    if not ids:
        raise ValueError(f"No results found for gene: {gene_name}")

    return ids[0]


def fetch_sequence(ncbi_id: str) -> dict:
    """Fetch the DNA sequence for a given NCBI nucleotide ID."""
    url = f"{NCBI_BASE}/efetch.fcgi"
    params = {
        "db": "nucleotide",
        "id": ncbi_id,
        "rettype": "gb",
        "retmode": "xml",
        "email": EMAIL,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    ns = {"ns": "http://www.ncbi.nlm.nih.gov/soap/eutils/efetch_seq"}

    # Extract sequence and metadata
    seq_elem = root.find(".//GBSeq_sequence")
    title_elem = root.find(".//GBSeq_definition")
    length_elem = root.find(".//GBSeq_length")

    if seq_elem is None:
        raise ValueError(f"No sequence found for ID: {ncbi_id}")

    return {
        "ncbi_id": ncbi_id,
        "title": title_elem.text if title_elem is not None else "Unknown",
        "length": int(length_elem.text) if length_elem is not None else 0,
        "sequence": seq_elem.text.upper(),
    }


def get_gene_sequence(gene_name: str) -> dict:
    """Main function: search for gene and return its sequence."""
    print(f"Searching NCBI for: {gene_name}")
    ncbi_id = search_gene(gene_name)
    print(f"Found NCBI ID: {ncbi_id} — fetching sequence...")
    result = fetch_sequence(ncbi_id)
    print(f"Retrieved sequence: {result['length']} bases")
    return result


if __name__ == "__main__":
    import sys
    gene = sys.argv[1] if len(sys.argv) > 1 else "BRCA1"
    data = get_gene_sequence(gene)
    print(f"\nGene: {data['title']}")
    print(f"Length: {data['length']} bases")
    print(f"First 100 bases: {data['sequence'][:100]}")