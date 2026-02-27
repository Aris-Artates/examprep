from fastapi import APIRouter, HTTPException
import os
import httpx

router = APIRouter()

@router.get("/embed")
async def get_embed(video_id: str):
    """Fetch Facebook embed HTML for a private video using a page access token."""
    token = os.getenv("FB_PAGE_ACCESS_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="FB_PAGE_ACCESS_TOKEN not configured")

    url = f"https://graph.facebook.com/{video_id}"
    params = {"fields": "embed_html", "access_token": token}
    try:
        resp = httpx.get(url, params=params, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        if "embed_html" not in data:
            raise HTTPException(status_code=500, detail="No embed_html returned")
        return {"embed_html": data["embed_html"]}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=str(e))
