"""Behavior tests for the host-side NIM setup, using fake Docker and NVIDIA CLIs."""
from pathlib import Path
import os
import stat
import subprocess


def test_nim_setup_rejects_unpinned_image_before_reading_key(tmp_path):
    root = Path(__file__).resolve().parents[1]
    script = tmp_path / "setup-nim.sh"
    script.write_text((root / "setup-nim.sh").read_text())
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    for name in ("docker", "nvidia-smi"):
        executable = fake_bin / name
        executable.write_text("#!/usr/bin/env bash\nexit 0\n")
        executable.chmod(0o755)
    env = os.environ.copy()
    env.update({
        "PATH": str(fake_bin) + os.pathsep + env["PATH"],
        "NIM_IMAGE": "nvcr.io/nim/meta/test-nim",
    })
    result = subprocess.run(
        ["bash", str(script)], cwd=tmp_path, env=env,
        input="", text=True, capture_output=True, timeout=10,
    )
    assert result.returncode != 0
    assert "explicit tag" in result.stderr
    assert not (tmp_path / ".env.nim").exists()


def test_nim_setup_scopes_secret_and_disables_competing_vllm(tmp_path):
    root = Path(__file__).resolve().parents[1]
    script = tmp_path / "setup-nim.sh"
    script.write_text((root / "setup-nim.sh").read_text())
    (tmp_path / ".env.example").write_text((root / ".env.example").read_text())
    (tmp_path / ".env").write_text(
        "LIGHTOS_GATEWAY_TOKEN=" + "a" * 64 + "\n"
        "COMPOSE_PROFILES=named,dcgm,inference\n"
        "VLLM_URL=http://vllm:8000\n"
        "MODEL=Qwen/Qwen2.5-1.5B-Instruct\n"
    )

    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    docker_log = tmp_path / "docker.log"
    (fake_bin / "docker").write_text(
        "#!/usr/bin/env bash\n"
        "printf '%s\\n' \"$*\" >> \"$DOCKER_LOG\"\n"
        "if [ \"$1\" = login ]; then cat >/dev/null; fi\n"
    )
    (fake_bin / "nvidia-smi").write_text(
        "#!/usr/bin/env bash\n"
        "if [ \"$1\" = --query-gpu=index,name,memory.total ]; then\n"
        "  printf '0, NVIDIA L4, 23034 MiB\\n'\n"
        "fi\n"
    )
    for executable in (fake_bin / "docker", fake_bin / "nvidia-smi"):
        executable.chmod(0o755)

    dummy_key = "test-only-ngc-key-not-a-credential"
    env = os.environ.copy()
    env.update({
        "PATH": str(fake_bin) + os.pathsep + env["PATH"],
        "DOCKER_LOG": str(docker_log),
        "NIM_IMAGE": "nvcr.io/nim/meta/test-nim:1.0.0",
        "INFERENCE_MODEL": "meta/test-nim",
    })
    result = subprocess.run(
        ["bash", str(script)], cwd=tmp_path, env=env,
        input="y\n" + dummy_key + "\n", text=True,
        capture_output=True, timeout=20, check=True,
    )

    # The key is never echoed or placed in process arguments or gateway config.
    assert dummy_key not in result.stdout + result.stderr
    assert dummy_key not in docker_log.read_text()
    assert "login nvcr.io --username $oauthtoken --password-stdin" in docker_log.read_text()
    gateway_env = (tmp_path / ".env").read_text()
    assert dummy_key not in gateway_env
    assert "COMPOSE_PROFILES=named,dcgm,nim\n" in gateway_env
    assert "INFERENCE_URL=http://nim:8000\n" in gateway_env
    assert "INFERENCE_MODEL=meta/test-nim\n" in gateway_env
    assert "NIM_IMAGE=nvcr.io/nim/meta/test-nim:1.0.0\n" in gateway_env
    assert "LIGHTOS_GATEWAY_TOKEN=" + "a" * 64 + "\n" in gateway_env

    nim_env = tmp_path / ".env.nim"
    assert nim_env.read_text() == "NGC_API_KEY=" + dummy_key + "\n"
    assert stat.S_IMODE(nim_env.stat().st_mode) == 0o600
    assert stat.S_IMODE((tmp_path / ".env").stat().st_mode) == 0o600
