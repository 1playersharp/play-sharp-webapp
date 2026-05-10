"""Club name canonicalization rules."""

import re
from typing import Optional


# Football abbreviations that should stay uppercase after title-casing.
_KEEP_UPPER = {
    "FC", "AFC", "AC", "CF", "SC", "FK", "CFC", "USD", "CD", "CA",
    "UFC", "UK", "USA", "US", "SK", "BK", "GK", "RB", "EFC", "PE", "JFC",
}


def canonical_club(raw: Optional[str]) -> str:
    """Normalise a user-submitted club name to a canonical form.

    Rules:
      - strip outer whitespace, collapse internal whitespace
      - title-case each word
      - keep common football abbreviations (FC, AFC, AC, ...) uppercase
      - keep age-group codes (U12, U-12, U21) uppercase
      - preserve hyphens in compound words
    """
    name = re.sub(r"\s+", " ", (raw or "")).strip()
    if not name:
        return ""

    def _cap_token(word: str) -> str:
        if not word:
            return word
        upper = word.upper()
        if upper in _KEEP_UPPER:
            return upper
        if re.fullmatch(r"U-?\d+", upper):
            return upper
        # Preserve user-supplied all-uppercase acronyms of length >= 2 that contain only letters.
        if len(word) >= 2 and word.isupper() and word.isalpha():
            return word
        return word[:1].upper() + word[1:].lower()

    def _cap(word: str) -> str:
        if "-" in word:
            return "-".join(_cap_token(p) for p in word.split("-"))
        return _cap_token(word)

    return " ".join(_cap(w) for w in name.split(" "))
