import asyncio
import os
import subprocess


async def ask_claude(prompt: str, timeout: int = 150) -> str:
    """Run claude -p from home dir (avoids project CLAUDE.md)."""

    def _run():
        try:
            result = subprocess.run(
                ['claude', '-p', prompt],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=os.path.expanduser('~'),
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            err = result.stderr.strip()
            return f"שגיאה: {err}" if err else "תגובה ריקה מ-Claude"
        except subprocess.TimeoutExpired:
            return "⏰ הזמן פג (150 שניות). נסה שוב."
        except FileNotFoundError:
            return "❌ Claude CLI לא נמצא. ודא ש-claude מותקן."
        except Exception as e:
            return f"❌ שגיאה: {e}"

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)
