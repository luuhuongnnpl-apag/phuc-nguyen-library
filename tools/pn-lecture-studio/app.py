import tempfile
from pathlib import Path
import gradio as gr
from vieneu import Vieneu

engine = None

def synthesize(reference, script, consent):
    global engine
    if not consent:
        raise gr.Error("Cần xác nhận quyền sử dụng giọng nói.")
    if not reference or not script.strip():
        raise gr.Error("Chọn mẫu giọng và nhập lời giảng.")
    if len(script) > 3000:
        raise gr.Error("Tối đa 3000 ký tự mỗi lượt.")
    if engine is None:
        engine = Vieneu(backend="onnx")
    audio = engine.infer(script.strip(), ref_audio=reference, denoise=True)
    path = str(Path(tempfile.mkdtemp(prefix="pn_voice_")) / "PNL_voice.wav")
    engine.save(audio, path)
    return path

with gr.Blocks(title="PN Voice Studio") as app:
    gr.Markdown("# PN Voice Studio\nPhúc Nguyên Library • Xử lý cục bộ bằng CPU")
    reference = gr.Audio(type="filepath", label="Mẫu giọng cá nhân (nên dùng 3–8 giây)", sources=["upload","microphone"])
    script = gr.Textbox(label="Lời giảng", lines=8, value="Chào các em. Hôm nay chúng ta nghiên cứu chế định thừa kế trong Bộ luật Dân sự.")
    consent = gr.Checkbox(label="Tôi có quyền sử dụng giọng nói này và đồng ý tạo âm thanh AI.")
    generate = gr.Button("Tạo lời giảng", variant="primary")
    output = gr.Audio(label="Lời giảng AI — nghe thử và tải WAV", type="filepath")
    generate.click(synthesize, [reference, script, consent], output, concurrency_limit=1)

if __name__ == "__main__":
    app.queue(default_concurrency_limit=1).launch(server_name="127.0.0.1", server_port=7861, share=False, inbrowser=True)
