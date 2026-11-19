# Garage art and racing notebook iterations

| Iteration | Change | Player-facing check |
| --- | --- | --- |
| 38 | Six wheel models distinguish the short kart slick, narrow wheelbarrow tyre, blocky dirt tyre, all-terrain, racing slick and grooved dirt tyre. | The inventory resolves each ID to a separate rendered file. Tread blocks and rim shapes are legible together in the contact sheet. |
| 39 | Four engine castings expose cylinder count and layout. The turbo four has an external compressor. | Checked each engine image against its actual part ID and inspected the four silhouettes together. |
| 40 | The wagon frame, tubular subframe and caged chassis show different construction. | Reviewed each transparent sprite at inventory scale, including the cage's upper frame and the wagon tongue. |
| 41 | The automatic and four-speed race boxes have distinct casing, ribs and selector hardware. | Both renders resolve separately in the part catalogue. |
| 42 | The race fuel cell and ignition box now use bespoke strapped-tank and wired-electronics models. | The previews show the fittings and wires that distinguish the components. |
| 43 | The glasspack uses an enamel body and metal pipe ends. | The salvage and build views can distinguish the silencer from the ordinary straight exhaust. |
| 44 | The auction shell shows a stripped body, open engine bay, pillars and wheel arches. | The loose shell and assembled Beater resolve to different images. |
| 45 | The discovered-parts Codex has searchable illustrations, individual specifications and known haul sources. | Search the earned Dirt Tire, load its picture, and read its known Junkyard source in the browser. |
| 46 | The Hall of Fame searches the full retained garage history, displays earlier cars in batches, and shows each fitted part and its origin. | A browser fixture with 34 retired karts opens the oldest kart and identifies its Worn Dirt Tire. |
| 47 | Journal searches combine season and text across retained history. | A personal-name query finds the entry and switching seasons removes it. |
| 48 | Recent head-to-head results open their own race replays directly from the rival record. | A recorded meeting opens a replay from the Notebook without entering the Race screen. |
| 49 | Replays support pause, resume, scrubbing, speed changes and replaying from the flag. Reduced-motion users still enter at the result. | The browser changes speed, seeks while paused, skips to the flag and closes the result. |
| 50 | Race history can show earlier results and filter by venue or outcome. | A 14-race garage opens all 14 replays from a 12-row initial list, then isolates its wins. |

The nineteen WebP cutouts were rendered locally with Blender from `scripts/render_garage_parts.py`. Every render has a transparent border on all four sides at 192 × 192 pixels. The runtime renders ordinary 2D images.
