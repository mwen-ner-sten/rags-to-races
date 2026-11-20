"""Fuel, electronics, body and junk. See render_parts.py."""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402,F401
from kit import TAU, arc, box, rod, torus, tube  # noqa: E402,F401
from mathutils import Vector  # noqa: E402,F401
from render_vehicles import _door_lines, _pillars, sedan_body  # noqa: E402

PI = math.pi


def fuel_gas_can():
    """A red plastic jerry can with a spout, a handle and a bungee cord."""
    w, d, h = 1.5, 0.7, 1.7
    can = kit.mat("oxblood", (1.5, 1.2, 1.2))
    box((0, 0, h / 2 + 0.05), (w, d, h), can, 0.12)
    for z in (0.5, 0.85, 1.2):  # embossed ribs
        box((0, -d / 2, z), (w * 0.86, 0.025, 0.07), can, 0.01)
    for a, b in (((-0.55, 0, h + 0.05), (-0.55, 0, h + 0.38)), ((-0.55, 0, h + 0.38), (0.0, 0, h + 0.38)),
                 ((0.0, 0, h + 0.38), (0.0, 0, h + 0.05))):
        rod(a, b, 0.07, can, 16, bevel=0)
    rod((0.5, 0, h + 0.05), (0.85, 0, h + 0.5), 0.11, can, 20, bevel=0)  # spout
    rod((0.85, 0, h + 0.5), (0.95, 0, h + 0.62), 0.14, "alloy", 20, bevel=0)
    for pos, dims in (((0.5, -d / 2, 0.45), (0.5, 0.02, 0.3)), ((-0.5, -d / 2, 1.3), (0.4, 0.02, 0.25))):
        box(pos, dims, "rust", 0)
    # Bungee cord crossed on the face, with a hook.
    y0 = -d / 2 - 0.03
    tube([(-0.78, y0, 0.3), (-0.2, y0, 0.9), (0.4, y0, 1.35), (0.78, y0, 1.5)], "teal_dim", 0.028)
    tube([(-0.78, y0, 1.35), (-0.2, y0, 0.9), (0.4, y0, 0.55), (0.78, y0, 0.2)], "rubber", 0.03)
    torus((-0.78, y0 - 0.02, 0.3), 0.07, 0.015, "steel", (PI / 2, 0, 0), 16)


def _tank_straps(xs, w, z0, z1, material="cast"):
    for x in xs:
        box((x, 0, (z0 + z1) / 2), (0.12, w + 0.06, z1 - z0 + 0.06), material, 0.01)
        for side in (-1, 1):
            rod((x, side * (w / 2 + 0.06), z0 - 0.05), (x, side * (w / 2 + 0.06), z0 - 0.35), 0.03, "steel", 8, bevel=0)


def fuel_tank_small():
    """A steel tank with strap-down bands, a plain cap and a hose out the bottom."""
    box((0, 0, 0.62), (2.0, 1.1, 0.9), "steel", 0.28)
    box((0, 0, 0.24), (2.0, 1.1, 0.12), "cast", 0.05)  # skid plate base
    _tank_straps((-0.6, 0.6), 1.1, 0.2, 1.05)
    rod((0.55, 0.2, 1.05), (0.55, 0.2, 1.22), 0.22, "alloy", 28)
    rod((0.55, 0.2, 1.22), (0.55, 0.2, 1.3), 0.28, "chrome", 28)
    box((0.55, 0.2, 1.34), (0.4, 0.07, 0.05), "alloy", 0.01)
    rod((-0.7, 0.2, 1.05), (-0.7, 0.2, 1.17), 0.07, "alloy", 12)  # vent
    rod((1.0, -0.4, 0.3), (1.2, -0.52, 0.3), 0.1, "alloy", 16)  # outlet
    tube([(1.2, -0.52, 0.3), (1.6, -0.7, 0.35), (1.9, -0.6, 0.15)], "rubber", 0.05)
    box((-0.75, -0.55, 0.7), (0.07, 0.025, 0.45), "teal", 0)  # sight gauge
    box((0.3, -0.56, 0.9), (0.5, 0.012, 0.2), "rust", 0)


def fuel_tank_large():
    """A big square steel tank with a baffled top, hold-downs and a filler neck."""
    box((0, 0, 0.7), (3.0, 1.7, 1.0), "steel", 0.1)
    for i in range(5):
        box((-1.1 + i * 0.55, 0, 1.21), (0.1, 1.4, 0.04), "steel", 0.01)
    _tank_straps((-0.9, 0.9), 1.7, 0.2, 1.2)
    rod((1.1, 0.3, 1.2), (1.1, 0.3, 1.45), 0.27, "alloy", 28)
    rod((1.1, 0.3, 1.45), (1.1, 0.3, 1.55), 0.35, "chrome", 28)
    torus((1.1, 0.3, 1.5), 0.31, 0.03, "teal", (0, 0, 0), 40)
    rod((1.5, 0.3, 1.2), (1.5, 0.3, 1.4), 0.07, "alloy", 12)  # vent
    box((-1.2, -0.3, 1.21), (0.35, 0.35, 0.03), "alloy", 0.01)  # sender plate
    box((1.45, -0.9, 0.35), (0.3, 0.2, 0.3), "cast", 0.04)  # sump
    rod((1.45, -1.0, 0.35), (1.45, -1.25, 0.35), 0.09, "alloy", 16)
    tube([(1.45, -1.25, 0.35), (1.7, -1.5, 0.3), (1.9, -1.4, 0.05)], "rubber", 0.06)
    box((0, -0.86, 0.8), (1.0, 0.012, 0.3), "rust", 0)


def fuel_cell():
    """A race fuel cell: a bolted alloy box, flush filler, braided lines."""
    box((0, 0, 0.6), (2.3, 1.7, 1.0), "alloy", 0.06)
    box((0, 0, 1.13), (2.15, 1.55, 0.06), "chrome", 0.02)  # top plate
    for i in range(9):
        for y in (-0.7, 0.7):
            rod((-1.0 + i * 0.25, y, 1.16), (-1.0 + i * 0.25, y, 1.2), 0.04, "steel", 10, bevel=0)
    for j in (-0.35, 0.0, 0.35):
        for x in (-1.0, 1.0):
            rod((x, j, 1.16), (x, j, 1.2), 0.04, "steel", 10, bevel=0)
    rod((0.1, 0.05, 1.16), (0.1, 0.05, 1.28), 0.42, "alloy", 40)
    rod((0.1, 0.05, 1.28), (0.1, 0.05, 1.34), 0.34, "chrome", 40)
    torus((0.1, 0.05, 1.3), 0.41, 0.025, "teal", (0, 0, 0), 48)
    box((0.1, 0.05, 1.37), (0.4, 0.07, 0.04), "alloy", 0.01)
    for sx in (-1, 1):  # mounting flanges
        box((sx * 1.28, 0, 0.18), (0.25, 1.9, 0.06), "cast", 0.01)
    for x in (-0.5, 0.5):  # AN fittings with braided lines
        rod((x, -0.85, 0.85), (x, -1.05, 0.85), 0.1, "alloy", 20)
        rod((x, -1.05, 0.85), (x, -1.15, 0.85), 0.13, "chrome", 6)
        tube([(x, -1.15, 0.85), (x + 0.3, -1.5, 0.8), (x + 0.5, -1.7, 0.3)], "steel", 0.06)
    rod((-0.8, 0.45, 1.16), (-0.8, 0.45, 1.34), 0.07, "alloy", 12)  # rollover vent


def elec_basic():
    """A taped-up wiring harness: connectors, ring terminals, two coloured wires."""
    trunk = [(-1.0, 0, 0.3), (-0.5, 0.3, 0.55), (0.0, -0.1, 0.4), (0.5, 0.3, 0.6), (1.0, 0.0, 0.3)]
    for dy, dz in ((0, 0.04), (0.05, 0), (-0.04, 0.03), (0.02, -0.05)):
        tube([(x, y + dy * 1.6, z + dz * 1.6) for x, y, z in trunk], "rubber", 0.07)
    for x, y, z in ((-0.4, 0.26, 0.5), (0.1, -0.08, 0.4), (0.6, 0.28, 0.58)):
        rod((x - 0.09, y, z), (x + 0.09, y, z), 0.19, "plastic", 16, bevel=0)  # tape wrap
    for sx in (-1, 1):
        box((sx * 1.1, 0, 0.3), (0.4, 0.6, 0.45), "plastic", 0.05)
        for i in range(3):
            box((sx * 1.1 + sx * 0.18, -0.15 + i * 0.15, 0.3), (0.03, 0.08, 0.08), "chrome", 0)
    branches = [((-0.5, 0.3, 0.55), (-0.8, 0.7, 0.3), (-0.5, 1.1, 0.12)),
                ((0.0, -0.1, 0.4), (0.3, -0.6, 0.25), (-0.1, -1.0, 0.1)),
                ((0.5, 0.3, 0.6), (0.8, 0.7, 0.35), (0.6, 1.0, 0.12)),
                ((-0.2, -0.05, 0.42), (-0.7, -0.5, 0.2), (-1.0, -0.9, 0.1))]
    for i, (a, b, c) in enumerate(branches):
        colour = "teal" if i == 1 else "fuchsia" if i == 2 else "rubber"
        tube([a, b, c], colour, 0.05 if colour == "rubber" else 0.032)
        torus(c, 0.07, 0.02, "chrome", (PI / 2, 0, 0.3 * i), 16)  # ring terminal


def elec_ecu():
    """An ECU: a ribbed alloy case with a big multi-pin plug and one status LED."""
    box((0, 0, 0.4), (1.9, 1.5, 0.7), "alloy", 0.06)
    for i in range(7):  # cooling ribs on the lid
        box((-0.75 + i * 0.25, 0, 0.78), (0.1, 1.3, 0.07), "cast", 0.01)
    for sy in (-1, 1):  # mounting ears
        box((0, sy * 0.9, 0.12), (0.5, 0.3, 0.06), "steel", 0.02)
        rod((0.0, sy * 0.92, 0.12), (0.0, sy * 0.92, 0.16), 0.07, "cast", 16, bevel=0)
    box((1.1, 0, 0.4), (0.4, 1.1, 0.5), "plastic", 0.04)
    for r in range(2):
        for c in range(7):
            y, z = -0.42 + c * 0.14, 0.3 + r * 0.18
            rod((1.31, y, z), (1.35, y, z), 0.035, "chrome", 8, bevel=0)
    for i in range(5):
        tube([(1.3, -0.3 + i * 0.15, 0.4), (1.6, -0.4 + i * 0.2, 0.3), (1.85, -0.5 + i * 0.25, 0.1)], "rubber", 0.04)
    box((-0.7, -0.76, 0.5), (0.5, 0.02, 0.12), "teal", 0)  # status LED strip
    box((0.2, -0.76, 0.4), (0.5, 0.012, 0.25), "cast", 0)  # label plate (blank)


def elec_ignition():
    """A racing ignition box: red case, finned heatsink end, four terminals and wires."""
    box((0, 0, 0.5), (1.7, 1.2, 0.9), "oxblood", 0.08)
    for i in range(6):
        box((-0.9, -0.5 + i * 0.2, 0.5), (0.12, 0.1, 0.92), "alloy", 0.01)
    box((0, -0.61, 0.5), (1.2, 0.02, 0.55), "alloy", 0.01)  # faceplate
    for i in range(4):
        x = -0.55 + i * 0.37
        rod((x, 0, 0.9), (x, 0, 1.07), 0.07, "alloy", 16)
        rod((x, 0, 1.07), (x, 0, 1.13), 0.1, "chrome", 6)
    tube([(-0.55, 0, 1.15), (-0.45, 0.06, 1.3), (-0.33, -0.06, 1.15), (-0.2, 0.05, 1.29), (-0.18, 0, 1.15)], "teal", 0.025)
    for i in range(4):
        tube([(0.85, -0.3 + i * 0.2, 0.5), (1.2, -0.4 + i * 0.27, 0.4), (1.5, -0.6 + i * 0.4, 0.12)], "rubber", 0.045)
    box((0.86, 0, 0.5), (0.04, 0.8, 0.4), "cast", 0.01)  # wire grommet plate


def beater_shell():
    """A stripped sedan body: no engine, no glass, no wheels, rust through the paint."""
    body = kit.mat("oxblood", (1.2, 1.3, 1.3))
    sedan_body(body, shell=True)
    for side in (-1, 1):  # bare front fenders, open engine bay
        box((1.5, side * 0.7, 0.62), (1.4, 0.22, 0.62), body, 0.03)
        rod((0.85, side * 0.8, 1.0), (0.2, side * 0.67, 1.44), 0.035, body, 12, bevel=0)
    box((1.55, 0, 0.35), (1.3, 0.7, 0.05), "cast", 0.01)  # engine bay floor
    box((2.1, 0, 0.62), (0.1, 1.5, 0.5), body, 0.03)  # radiator support
    box((1.2, 0, 0.7), (0.06, 0.8, 0.3), "cast", 0.01)  # firewall
    _pillars(body)
    box((-0.25, 0, 1.455), (0.86, 1.32, 0.045), body, 0.02)  # roof
    _door_lines()
    box((-1.55, 0, 1.025), (1.0, 1.7, 0.04), body, 0.02)  # trunk lid
    for pos, dims in (((-0.1, -0.908, 0.6), (1.2, 0.012, 0.35)), ((1.55, -0.83, 0.62), (0.7, 0.012, 0.3)),
                      ((-1.6, -0.9, 0.6), (0.6, 0.012, 0.3)), ((-0.2, 0, 1.485), (0.6, 0.8, 0.012)),
                      ((-1.5, 0.2, 1.05), (0.7, 0.8, 0.012))):
        box(pos, dims, "rust", 0)
    box((0.9, 0, 0.82), (0.2, 1.5, 0.4), body, 0.03)  # cowl under the windscreen
    box((-0.15, 0, 0.5), (1.9, 1.5, 0.04), "cast", 0)  # bare floor pan
    box((-0.15, 0, 0.53), (0.5, 0.4, 0.01), "teal_dim", 0)  # a faint glow from inside


def junk_misc():
    """A small pile: bolts, a bracket, a gear, a can and a doll's head."""
    rng = random.Random(3)
    box((0, 0, 0.1), (1.9, 1.5, 0.2), "rust", 0.08)  # a bent plate everything sits on
    for _ in range(7):
        x, y, a = rng.uniform(-0.8, 0.8), rng.uniform(-0.6, 0.6), rng.uniform(0, PI)
        rod((x, y, 0.28), (x + math.cos(a) * 0.35, y + math.sin(a) * 0.35, 0.28), 0.045, "steel", 8, bevel=0)
        rod((x, y, 0.28), (x - math.cos(a) * 0.04, y - math.sin(a) * 0.04, 0.28), 0.08, "steel", 6, bevel=0)
    box((-0.55, -0.1, 0.45), (0.7, 0.18, 0.05), "steel", 0.01, (0, 0, 0.5))  # bracket
    box((-0.3, 0.0, 0.57), (0.05, 0.18, 0.28), "steel", 0.01, (0, 0, 0.5))
    rod((0.4, -0.3, 0.3), (0.4, -0.3, 0.4), 0.3, "cast", 24)  # gear
    for i in range(12):
        a = TAU * i / 12
        box((0.4 + 0.3 * math.cos(a), -0.3 + 0.3 * math.sin(a), 0.35), (0.1, 0.1, 0.1), "cast", 0, (0, 0, a))
    rod((0.4, -0.3, 0.3), (0.4, -0.3, 0.42), 0.09, "rust", 12)
    rod((-0.1, 0.55, 0.2), (-0.1, 0.55, 0.75), 0.2, "rust", 20)  # tin can
    torus((-0.1, 0.55, 0.75), 0.2, 0.025, "steel", (0, 0, 0), 24)
    kit.ball((0.6, 0.4, 0.5), 0.23, "canvas")  # the doll's head
    kit.ball((0.47, 0.2, 0.56), 0.045, "ice_dim")  # one glass eye catching light
    kit.ball((0.68, 0.19, 0.58), 0.04, "cast")
    tube([(-0.9, -0.5, 0.3), (-0.5, -0.65, 0.4), (-0.1, -0.5, 0.3), (0.0, -0.7, 0.28)], "rubber", 0.03)  # cable


def junk_seat():
    """An old bucket seat: split vinyl, sagging foam and rusted springs and rails."""
    for sy in (-0.45, 0.45):  # seat rails
        rod((-0.9, sy, 0.1), (1.0, sy, 0.1), 0.05, "rust", 10, bevel=0)
        box((0.8, sy, 0.22), (0.1, 0.1, 0.25), "rust", 0.01)
        box((-0.7, sy, 0.22), (0.1, 0.1, 0.25), "rust", 0.01)
    box((0.1, 0, 0.5), (1.5, 1.2, 0.3), "rust", 0.02)  # pan
    for i in range(5):  # exposed springs
        for j in range(3):
            x, y = -0.5 + i * 0.3, -0.4 + j * 0.4
            tube([(x, y, 0.6), (x + 0.05, y + 0.05, 0.7), (x, y + 0.1, 0.78)], "steel", 0.018)
    box((0.15, 0.0, 0.76), (1.4, 1.1, 0.28), "canvas", 0.12)  # sagging cushion
    box((0.6, -0.1, 0.9), (0.45, 0.5, 0.1), "canvas", 0.06)
    box((-0.75, 0, 1.2), (0.28, 1.15, 1.0), "canvas", 0.12, (0, -0.12, 0))  # backrest
    for s in (-1, 1):
        box((-0.92, s * 0.5, 1.45), (0.2, 0.18, 0.5), "canvas", 0.07, (0, -0.12, 0))  # bolsters
    box((0.2, -0.56, 0.78), (1.1, 0.015, 0.012), "teal_dim", 0)  # seam piping
    box((-0.88, -0.2, 1.25), (0.02, 0.015, 0.7), "teal_dim", 0, (0, -0.12, 0))
    box((0.2, -0.575, 0.7), (0.5, 0.02, 0.14), "cast", 0)  # split in the vinyl


PARTS = {
    "fuel_gas_can": fuel_gas_can,
    "fuel_tank_small": fuel_tank_small,
    "fuel_tank_large": fuel_tank_large,
    "fuel_cell": fuel_cell,
    "elec_basic": elec_basic,
    "elec_ecu": elec_ecu,
    "elec_ignition": elec_ignition,
    "beater_shell": beater_shell,
    "junk_misc": junk_misc,
    "junk_seat": junk_seat,
}
