# Resume fonts

Latin-subset TTF files used by both the on-screen preview and the PDF export, so the two match.
Downloaded from Fontsource (https://fontsource.org). Each file is named `<font>-<weight>-<style>.ttf`.

| Font | License |
| --- | --- |
| Source Serif 4, Merriweather, Lora, EB Garamond, Inter, Lato, Source Sans 3 | SIL Open Font License 1.1 |
| Roboto | Apache License 2.0 (newer releases: SIL Open Font License 1.1) |
| Latin Modern Roman and Latin Modern Roman Caps (`latin-modern-*`) | GUST Font License (http://tug.org/fonts/licenses/GUST-FONT-LICENSE.txt) |

The Latin Modern files come from CTAN (`fonts/lm`). They were converted from OpenType (CFF) to TrueType outlines, which jsPDF needs, and cut down to the same Latin character range with no kerning or ligature tables (jsPDF applies neither, so the preview must not either). As the GUST Font License asks of modified versions, they are renamed "RA Latin Modern Roman" and "RA Latin Modern Roman Caps".
