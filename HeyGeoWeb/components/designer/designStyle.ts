/** Sketchpad's look: orange-red points with a black rim, bold italic serif names, heavy navy lines. */

export const LINE_INK = '#000080';
export const LINE_WIDTH = 3;

/** The purple Sketchpad draws around whatever is selected. */
export const SELECT_INK = '#a030c8';

const POINT_FILL = '#ff4a1f';
const POINT_RIM = '#000000';

const LABEL_CSS = 'font-family: "Times New Roman", Times, serif; font-style: italic; font-weight: bold;';

/** Attributes every point is drawn with, whatever built it. A fresh object each call. */
export function pointStyle() {
  return {
    size: 3,
    face: 'o' as const,
    strokeColor: POINT_RIM,
    strokeWidth: 1.5,
    fillColor: POINT_FILL,
    label: { fontSize: 16, strokeColor: '#000000', cssStyle: LABEL_CSS },
  };
}
