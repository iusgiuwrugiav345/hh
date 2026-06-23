import tkinter as tk
from tkinter import ttk


class DpiDesyncApp:
    """
    Demo app where UI scaling (DPI) is intentionally desynchronized
    from the value shown in the settings menu.
    """

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("DPI Desync Demo")

        # Base font size and app state
        self.base_font_px = 12
        self.displayed_dpi = tk.IntVar(value=100)
        self.actual_dpi = 100

        # How much the real DPI should differ from the value in settings.
        self.desync_offset = tk.IntVar(value=25)

        self._build_ui()
        self._apply_desynced_dpi(self.displayed_dpi.get())

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=12)
        outer.grid(sticky="nsew")
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Main content area
        self.preview_frame = ttk.LabelFrame(outer, text="Preview", padding=12)
        self.preview_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 12))

        self.preview_label = ttk.Label(
            self.preview_frame,
            text=(
                "This text scales with ACTUAL DPI.\n"
                "Settings menu shows DISPLAYED DPI.\n"
                "They are intentionally different."
            ),
            justify="left",
        )
        self.preview_label.grid(row=0, column=0, sticky="w")

        self.dpi_info = ttk.Label(self.preview_frame, text="")
        self.dpi_info.grid(row=1, column=0, sticky="w", pady=(10, 0))

        # Settings panel
        settings = ttk.LabelFrame(outer, text="Settings", padding=12)
        settings.grid(row=0, column=1, sticky="ns")

        ttk.Label(settings, text="Displayed DPI (menu value):").grid(
            row=0, column=0, sticky="w"
        )
        displayed_slider = ttk.Scale(
            settings,
            from_=50,
            to=250,
            orient="horizontal",
            command=self._on_displayed_change,
        )
        displayed_slider.set(self.displayed_dpi.get())
        displayed_slider.grid(row=1, column=0, sticky="ew", pady=(4, 10))

        ttk.Label(settings, textvariable=self.displayed_dpi).grid(
            row=2, column=0, sticky="w"
        )

        ttk.Separator(settings, orient="horizontal").grid(
            row=3, column=0, sticky="ew", pady=10
        )

        ttk.Label(settings, text="Desync offset (+/-):").grid(row=4, column=0, sticky="w")

        offset_slider = ttk.Scale(
            settings,
            from_=-100,
            to=100,
            orient="horizontal",
            command=self._on_offset_change,
        )
        offset_slider.set(self.desync_offset.get())
        offset_slider.grid(row=5, column=0, sticky="ew", pady=(4, 10))

        self.offset_label = ttk.Label(settings, text=f"{self.desync_offset.get()}%")
        self.offset_label.grid(row=6, column=0, sticky="w")

        ttk.Button(
            settings,
            text="Randomize desync",
            command=self._randomize_desync,
        ).grid(row=7, column=0, sticky="ew", pady=(16, 0))

        settings.columnconfigure(0, weight=1)
        outer.columnconfigure(0, weight=1)

    def _on_displayed_change(self, value: str) -> None:
        shown = int(float(value))
        self._apply_desynced_dpi(shown)

    def _on_offset_change(self, value: str) -> None:
        self.desync_offset.set(int(float(value)))
        self.offset_label.config(text=f"{self.desync_offset.get()}%")
        self._apply_desynced_dpi(self.displayed_dpi.get())

    def _randomize_desync(self) -> None:
        # Simple deterministic pseudo-random step without extra imports
        next_offset = ((self.desync_offset.get() * 37 + 53) % 201) - 100
        self.desync_offset.set(next_offset)
        self.offset_label.config(text=f"{next_offset}%")
        self._apply_desynced_dpi(self.displayed_dpi.get())

    def _apply_desynced_dpi(self, displayed_dpi: int) -> None:
        self.displayed_dpi.set(displayed_dpi)

        # Core behavior: actual DPI is intentionally not equal to displayed DPI.
        self.actual_dpi = max(50, min(300, displayed_dpi + self.desync_offset.get()))

        scale_factor = self.actual_dpi / 100.0
        font_px = max(8, int(self.base_font_px * scale_factor))

        # Apply visual scale effect to preview text only.
        self.preview_label.configure(font=("TkDefaultFont", font_px))
        self.dpi_info.configure(
            text=(
                f"Displayed DPI: {self.displayed_dpi.get()}%\n"
                f"Actual DPI: {self.actual_dpi}%\n"
                f"Desync: {self.actual_dpi - self.displayed_dpi.get():+d}%"
            )
        )


def main() -> None:
    root = tk.Tk()
    DpiDesyncApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
