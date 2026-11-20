"""Rally stage markers: tiny top-down cars, nose pointing +X (right).

    blender --background --factory-startup --python scripts/art/render_rally.py -- [kart|mower|saloon ...]

RallyStage.tsx rotates the marker by atan2(dy, dx), so angle 0 means the nose
points right. The models are the vehicle models seen from above, with a teal
roof stripe added so they read on the dark stage map.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402
import render_vehicles as rv  # noqa: E402
from kit import box  # noqa: E402

SIZE = (320, 240)  # 2x the shipped 160x120


def kart():
    rv.go_kart()
    box((0.1, 0, 0.5), (1.0, 0.07, 0.01), "teal_dim", 0)  # stripe over the seat and nose
    box((0.6, 0, 0.27), (0.4, 0.07, 0.01), "teal_dim", 0)


def mower():
    rv.riding_mower()
    box((0.7, 0, 0.67), (0.6, 0.07, 0.01), "teal_dim", 0)  # stripe along the hood
    box((-0.4, 0, 0.6), (0.4, 0.07, 0.01), "teal_dim", 0)


def saloon():
    rv.beater_car()
    box((0.0, 0, 1.485), (0.8, 0.14, 0.01), "teal_dim", 0)  # roof stripe
    box((1.4, 0, 0.945), (1.0, 0.14, 0.01), "teal_dim", 0)  # bonnet stripe
    box((-1.5, 0, 1.055), (0.9, 0.14, 0.01), "teal_dim", 0)  # boot stripe
    for x in rv.WHEEL_X:  # flared tyres so the wheels read from above
        for side in (-1, 1):
            box((x, side * 0.9, 0.34), (0.62, 0.14, 0.3), "rubber", 0.04)


RALLY = {"kart": kart, "mower": mower, "saloon": saloon}

if __name__ == "__main__":
    kit.run("rally", RALLY, SIZE, top_down=True)
