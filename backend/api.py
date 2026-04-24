"""
api.py
Combined Flask server for Gene Explorer.
Endpoints:
  GET /api/drugs?gene=BRCA1     — drug-gene interactions from DGIdb
  GET /api/crispr?gene=BRCA1    — CRISPR guide RNA candidates from NCBI
  GET /api/health               — health check
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from fetcher import get_gene_sequence
from designer import design_guides
import requests

app = Flask(__name__)
CORS(app)

DGIDB_URL = "https://dgidb.org/api/graphql"

DRUG_QUERY = """
query getInteractions($gene: String!) {
  genes(names: [$gene]) {
    nodes {
      name
      longName
      interactions {
        drug { name approved }
        interactionTypes { type }
        interactionScore
        sources { fullName }
      }
    }
  }
}
"""


@app.route("/api/drugs", methods=["GET"])
def drugs():
    gene = request.args.get("gene", "").strip().upper()
    if not gene:
        return jsonify({"error": "No gene provided"}), 400

    try:
        response = requests.post(
            DGIDB_URL,
            json={"query": DRUG_QUERY, "variables": {"gene": gene}},
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        nodes = data.get("data", {}).get("genes", {}).get("nodes", [])
        if not nodes:
            return jsonify({"error": f"No drug interactions found for: {gene}"}), 404

        g = nodes[0]
        interactions = []
        for i in g["interactions"]:
            interactions.append({
                "drug": i["drug"]["name"],
                "approved": i["drug"]["approved"],
                "types": [t["type"] for t in i["interactionTypes"]] or ["unknown"],
                "score": i["interactionScore"],
                "sources": [s["fullName"] for s in i["sources"]],
            })

        interactions.sort(key=lambda x: x["score"] or 0, reverse=True)

        return jsonify({
            "gene": g["name"],
            "full_name": g["longName"],
            "total": len(interactions),
            "approved_count": sum(1 for i in interactions if i["approved"]),
            "interactions": interactions,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/crispr", methods=["GET"])
def crispr():
    gene = request.args.get("gene", "").strip().upper()
    if not gene:
        return jsonify({"error": "No gene provided"}), 400

    try:
        data = get_gene_sequence(gene)
        guides = design_guides(data["sequence"])
        return jsonify({
            "gene": gene,
            "title": data["title"],
            "sequence_length": data["length"],
            "guides": guides,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5001)