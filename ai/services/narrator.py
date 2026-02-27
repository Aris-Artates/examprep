"""
narrator.py — Uses Docker Model Runner (free, local, no API key)
to generate human-readable result narratives for students.
"""
import httpx
import os
import json

DOCKER_MODEL_RUNNER_URL = os.getenv(
    "DOCKER_MODEL_RUNNER_URL",
    "http://model-runner.docker.internal/engines/llama.cpp/v1"
)
MODEL_NAME = os.getenv("AI_MODEL", "ai/smollm2")

async def generate_narrative(
    section_scores: dict,
    total_score: int,
    school_compatibility: list,
    student_name: str = "",
) -> str:
    top_schools = school_compatibility[:3]
    name_line = f"Student name: {student_name}" if student_name else "Student name: not provided"

    prompt = f"""You are an encouraging academic counselor helping a Filipino student understand their PSHS entrance exam practice results.

{name_line}
Student scores: {json.dumps(section_scores)}
Total: {total_score} points

Top compatible campuses: {json.dumps(top_schools)}

Write a warm, encouraging 3-4 sentence analysis. 
- If a student name is provided, address them by first name only at the start.
- If no name is provided, just start with the analysis directly, do NOT use placeholders like [Student's Name].
- Highlight their strongest subject.
- Mention which campus they are most compatible with.
- Give one specific study tip for their weakest subject.
- End with motivation.

Write in plain English, no bullet points, no placeholders."""

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{DOCKER_MODEL_RUNNER_URL}/chat/completions",
                json={
                    "model": MODEL_NAME,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 400,
                },
            )
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Narrative generation error: {e}")
        strongest = max(section_scores, key=section_scores.get) if section_scores else "overall"
        top = top_schools[0]["name"] if top_schools else "PSHS"
        greeting = f"Hi {student_name}! " if student_name else ""
        return (
            f"{greeting}Great effort on your practice test! "
            f"Your strongest area was {strongest}, and based on your performance "
            f"you show strong compatibility with {top}. "
            f"Keep practicing consistently and you'll be well-prepared for exam day!"
        )