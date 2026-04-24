"""
designer.py
Scans a DNA sequence for CRISPR guide RNA candidates.
Finds NGG PAM sites and scores each 20bp guide RNA upstream.
"""

GUIDE_LENGTH = 20  # Standard guide RNA length
PAM = "GG"         # NGG PAM — N is any base, we check for GG at positions 1,2


def find_guides(sequence: str) -> list:
    """
    Scan sequence for NGG PAM sites and extract 20bp guide RNAs.
    Returns list of candidate guide RNAs with position and strand.
    """
    sequence = sequence.upper()
    candidates = []

    # Search forward strand for NGG
    for i in range(len(sequence) - GUIDE_LENGTH - 3):
        pam_start = i + GUIDE_LENGTH
        pam = sequence[pam_start:pam_start + 3]

        # Check for NGG (N = any base, GG at positions 1 and 2)
        if pam[1:] == PAM:
            guide = sequence[i:i + GUIDE_LENGTH]
            if len(guide) == GUIDE_LENGTH:
                candidates.append({
                    "guide": guide,
                    "pam": pam,
                    "position": i,
                    "strand": "+"
                })

    # Search reverse complement strand for NGG
    rev_comp = reverse_complement(sequence)
    for i in range(len(rev_comp) - GUIDE_LENGTH - 3):
        pam_start = i + GUIDE_LENGTH
        pam = rev_comp[pam_start:pam_start + 3]

        if pam[1:] == PAM:
            guide = rev_comp[i:i + GUIDE_LENGTH]
            if len(guide) == GUIDE_LENGTH:
                candidates.append({
                    "guide": guide,
                    "pam": pam,
                    "position": len(sequence) - i - GUIDE_LENGTH,
                    "strand": "-"
                })

    return candidates


def reverse_complement(sequence: str) -> str:
    """Return the reverse complement of a DNA sequence."""
    complement = {"A": "T", "T": "A", "C": "G", "G": "C", "N": "N"}
    return "".join(complement.get(base, "N") for base in reversed(sequence))


def gc_content(sequence: str) -> float:
    """Calculate GC content as a percentage."""
    gc = sum(1 for base in sequence if base in "GC")
    return (gc / len(sequence)) * 100 if sequence else 0


def has_homopolymer(sequence: str, length: int = 4) -> bool:
    """Check if sequence has a run of the same base (bad for efficiency)."""
    for base in "ATCG":
        if base * length in sequence:
            return True
    return False


def score_guide(guide: str) -> dict:
    """
    Score a guide RNA candidate.
    Returns score 0-100 and breakdown of scoring factors.
    """
    score = 100
    reasons = []

    # GC content: ideal is 40-70%
    gc = gc_content(guide)
    if 40 <= gc <= 70:
        reasons.append(f"GC content {gc:.0f}% (optimal)")
    elif gc < 30 or gc > 80:
        score -= 40
        reasons.append(f"GC content {gc:.0f}% (poor)")
    else:
        score -= 15
        reasons.append(f"GC content {gc:.0f}% (acceptable)")

    # Homopolymer runs: penalize 4+ of same base
    if has_homopolymer(guide, 4):
        score -= 25
        reasons.append("Homopolymer run detected (reduces efficiency)")
    else:
        reasons.append("No homopolymer runs (good)")

    # Penalize guides starting with T (reduces expression)
    if guide[0] == "T":
        score -= 10
        reasons.append("Starts with T (slight penalty)")

    # Reward guides ending in G (better Cas9 binding)
    if guide[-1] in "GC":
        score += 5
        reasons.append("Ends in G/C (slight bonus)")

    score = max(0, min(100, score))
    return {"score": score, "gc_content": round(gc, 1), "reasons": reasons}


def design_guides(sequence: str, top_n: int = 10) -> list:
    """Find and score all guide RNA candidates, return top N."""
    candidates = find_guides(sequence)

    results = []
    for candidate in candidates:
        scoring = score_guide(candidate["guide"])
        results.append({
            "guide": candidate["guide"],
            "pam": candidate["pam"],
            "position": candidate["position"],
            "strand": candidate["strand"],
            "score": scoring["score"],
            "gc_content": scoring["gc_content"],
            "reasons": scoring["reasons"],
        })

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def print_results(guides: list, gene_name: str):
    """Print guide RNA results to terminal."""
    print(f"\n{'='*65}")
    print(f"CRISPR Guide RNA Candidates for {gene_name}")
    print(f"Found {len(guides)} top candidates")
    print(f"{'='*65}\n")

    print(f"{'#':<4} {'Guide RNA (20bp)':<22} {'PAM':<5} {'Score':<7} {'GC%':<6} {'Strand'}")
    print("-" * 65)
    for i, g in enumerate(guides, 1):
        print(f"{i:<4} {g['guide']:<22} {g['pam']:<5} {g['score']:<7} {g['gc_content']:<6} {g['strand']}")
        for reason in g["reasons"]:
            print(f"     → {reason}")
        print()


if __name__ == "__main__":
    from fetcher import get_gene_sequence
    import sys

    gene = sys.argv[1] if len(sys.argv) > 1 else "BRCA1"
    data = get_gene_sequence(gene)
    guides = design_guides(data["sequence"])
    print_results(guides, gene)