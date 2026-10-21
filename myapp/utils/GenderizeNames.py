from typing import List, Dict, Optional, Any

from demografix import Demografix
from demografix.errors import DemografixError

from myapp.config import Config
from myapp.utils.Async import make_async

FEMALE_PROBABILITY_THRESHOLD = 0.8


def _get_client() -> Demografix:
    api_key = getattr(Config, "DEMOGRAFIX_API_KEY", "") or ""
    if not api_key:
        raise DemografixError(
            "DEMOGRAFIX_API_KEY não configurada no ambiente (.env)."
        )
    return Demografix(api_key=api_key)


_TITLE_PREFIXES = {
    "dr", "dra", "drs", "dras", "prof", "profa", "profº", "profª",
    "me", "msc", "phd", "mestre", "mestra", "sr", "sra", "srta",
}


def _first_name(full_name: str) -> str:
    if not full_name:
        return ""
    for token in full_name.strip().split():
        cleaned = token.strip(".,").lower()
        if not cleaned or cleaned in _TITLE_PREFIXES:
            continue
        return token.strip(".,")
    return ""


def genderize_name(name: str, country_id: Optional[str] = "BR") -> Dict[str, Any]:
    first = _first_name(name)
    if not first:
        return {"name": name, "gender": None, "probability": 0.0,
                "count": 0, "is_female": False}

    client = _get_client()
    result = client.genderize(first, country_id=country_id)

    return {
        "name": name,
        "gender": result.gender,
        "probability": result.probability,
        "count": result.count,
        "is_female": result.gender == "female"
        and result.probability >= FEMALE_PROBABILITY_THRESHOLD,
    }


def genderize_names(
    names: List[str], country_id: Optional[str] = "BR"
) -> List[Dict[str, Any]]:
    """Estima o gênero de uma lista de nomes em uma única chamada em lote."""
    firsts = [_first_name(n) for n in names]
    valid = [(original, first) for original, first in zip(names, firsts) if first]
    if not valid:
        return [{"name": n, "gender": None, "probability": 0.0,
                 "count": 0, "is_female": False} for n in names]

    client = _get_client()
    batch = client.genderize_batch([first for _, first in valid], country_id=country_id)

    by_first: Dict[str, Any] = {r.name.lower(): r for r in batch.results}

    output: List[Dict[str, Any]] = []
    for original, first in zip(names, firsts):
        r = by_first.get(first.lower()) if first else None
        if r is None:
            output.append({"name": original, "gender": None, "probability": 0.0,
                           "count": 0, "is_female": False})
            continue
        output.append({
            "name": original,
            "gender": r.gender,
            "probability": r.probability,
            "count": r.count,
            "is_female": r.gender == "female"
            and r.probability >= FEMALE_PROBABILITY_THRESHOLD,
        })
    return output


def female_authorship_share(authors: List[str], country_id: Optional[str] = "BR") -> int:
    if not authors:
        return 0
    predictions = genderize_names(authors, country_id=country_id)
    female = sum(1 for p in predictions if p["is_female"])
    return round(female / len(authors) * 100)


genderize_name_async = make_async(genderize_name)
genderize_names_async = make_async(genderize_names)
female_authorship_share_async = make_async(female_authorship_share)