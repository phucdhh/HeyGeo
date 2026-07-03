// Phân phối chuẩn N(μ, σ²) – dành cho HeyGeo CindyJS Editor
// Paste toàn bộ file này vào https://heygeo.pedu.vn/cindy
//
// Kéo điểm ĐỎ  (A) để thay đổi kỳ vọng μ
// Kéo điểm XANH (B) để thay đổi độ lệch chuẩn σ  (σ = B.x − A.x)

var instance = CindyJS({
  ports: [{ id: BOARDID, width: 820, height: 520, background: "rgb(244,246,253)" }],
  geometry: [
    { name: "A", type: "Free", pos: [  0.0, -2.0 ], color: [0.86, 0.10, 0.10], size: 11, labeled: false },
    { name: "B", type: "Free", pos: [  1.0, -2.0 ], color: [0.06, 0.66, 0.22], size: 11, labeled: false }
  ],
  scripts: {
    // ─── INIT ──────────────────────────────────────────────────────
    init: `
      AX := -2.0;
      SC := 10.0;
    `,

    // ─── MOVE ──────────────────────────────────────────────────────
    move: `
      A.y := AX;
      B.y := AX;
      A.x := max(-6.5, min(6.0, A.x));
      B.x := max(A.x + 0.25, min(A.x + 3.5, B.x));
    `,

    // ─── DRAW ──────────────────────────────────────────────────────
    draw: `
      mu    := A.x;
      sigma := B.x - A.x;

      h(x) := AX + SC / (sigma * sqrt(2*pi)) * exp(-(x - mu)^2 / (2*sigma^2));
      xC(i) := mu - 4.5*sigma + i * 9*sigma / 240;

      // Background
      fillpoly([(-8.5,-5.5),(8.5,-5.5),(8.5,5.5),(-8.5,5.5)],
               color->[0.957,0.961,0.988]);

      // Grid – vertical
      forall(-8..8, k,
        draw((k,-5.5),(k,5.5), color->[0.872,0.883,0.918], linewidth->0.6)
      );
      // Grid – horizontal
      forall(-5..5, k,
        draw((-8.5, k),(8.5, k), color->[0.872,0.883,0.918], linewidth->0.6)
      );

      // ±2σ shaded region
      poly2 := apply(0..122, i,
        if(i <= 120,
          (mu - 2*sigma + i*4*sigma/120,
           h(mu - 2*sigma + i*4*sigma/120)),
          if(i == 121,
            (mu + 2*sigma, AX),
            (mu - 2*sigma, AX)
          )
        )
      );
      fillpoly(poly2, color->[0.318,0.588,0.898], alpha->0.15);

      // ±1σ shaded region
      poly1 := apply(0..82, i,
        if(i <= 80,
          (mu - sigma + i*2*sigma/80,
           h(mu - sigma + i*2*sigma/80)),
          if(i == 81,
            (mu + sigma, AX),
            (mu - sigma, AX)
          )
        )
      );
      fillpoly(poly1, color->[0.180,0.420,0.860], alpha->0.30);

      // Bell curve
      curvePts := apply(0..240, i, (xC(i), h(xC(i))));
      connect(curvePts, color->[0.090,0.270,0.800], linewidth->2.8);

      // X-axis
      draw((-8.2, AX),(8.2, AX), color->[0.15,0.15,0.20], linewidth->1.6);

      // Tick marks + labels
      forall(-8..8, k,
        draw((k, AX-0.13),(k, AX+0.13), color->[0.30,0.30,0.38], linewidth->1.0);
        drawtext((k-0.12, AX-0.58), text(k), color->[0.30,0.30,0.38], size->11)
      );
      drawtext((8.0, AX-0.56), "x", color->[0.18,0.18,0.26], size->13);

      // Vertical reference: μ
      draw((mu, AX),(mu, h(mu)), color->[0.060,0.520,0.160], linewidth->2.0);

      // Vertical reference: ±1σ
      draw((mu-sigma, AX),(mu-sigma, h(mu-sigma)), color->[0.820,0.160,0.100], linewidth->1.3);
      draw((mu+sigma, AX),(mu+sigma, h(mu+sigma)), color->[0.820,0.160,0.100], linewidth->1.3);

      // Vertical reference: ±2σ
      draw((mu-2*sigma, AX),(mu-2*sigma, h(mu-2*sigma)), color->[0.860,0.500,0.080], linewidth->1.0);
      draw((mu+2*sigma, AX),(mu+2*sigma, h(mu+2*sigma)), color->[0.860,0.500,0.080], linewidth->1.0);

      // Bracket labels ±1σ
      drawtext((mu-sigma-0.18, AX-0.80), "μ−σ", color->[0.760,0.130,0.080], size->11);
      drawtext((mu+sigma-0.18, AX-0.80), "μ+σ", color->[0.760,0.130,0.080], size->11);

      // Info panel background + border
      fillpoly([(3.50, 0.60),(7.90, 0.60),(7.90, 4.80),(3.50, 4.80)],
               color->[1.00,1.00,1.00], alpha->0.88);
      draw((3.50,0.60),(7.90,0.60), color->[0.72,0.78,0.90], linewidth->1);
      draw((7.90,0.60),(7.90,4.80), color->[0.72,0.78,0.90], linewidth->1);
      draw((7.90,4.80),(3.50,4.80), color->[0.72,0.78,0.90], linewidth->1);
      draw((3.50,4.80),(3.50,0.60), color->[0.72,0.78,0.90], linewidth->1);

      // Info values
      drawtext((3.72, 4.32), "μ  =  " + text(round(mu*100)/100),
               color->[0.06,0.46,0.14], size->14);
      drawtext((3.72, 3.68), "σ  =  " + text(round(sigma*100)/100),
               color->[0.76,0.12,0.08], size->14);
      drawtext((3.72, 3.04), "f(μ) = " + text(round(SC/(sigma*sqrt(2*pi))*1000)/1000),
               color->[0.18,0.28,0.60], size->13);
      drawtext((3.72, 2.32), "P(μ ± σ)   ≈ 68.27 %", color->[0.14,0.36,0.80], size->12);
      drawtext((3.72, 1.74), "P(μ ± 2σ) ≈ 95.45 %",  color->[0.78,0.44,0.06], size->12);
      drawtext((3.72, 1.16), "P(μ ± 3σ) ≈ 99.73 %",  color->[0.52,0.12,0.60], size->12);

      // Control points (on top)
      draw(A, color->[0.86,0.10,0.10], size->11);
      draw(B, color->[0.06,0.66,0.22], size->11);

      drawtext((mu-0.12, AX-1.05), "μ",   color->[0.82,0.10,0.10], size->15);
      drawtext((B.x-0.16, AX-1.05), "μ+σ", color->[0.04,0.58,0.18], size->13);
    `
  },
  csconsole: false,
});
