[![make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/noedistro/best-flight-game-entry/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/noedistro/best-flight-game-entry/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

# Arang Skylark — 5 missions, 3 airfields, 12 rings, fuel & damage, 240-second sorties over Teluk Arang

Pilot **Rani Kusuma** flies the dawn mail run for the island chain of **Teluk Arang**,
a fictional harbour archipelago where fishing boats unload at dawn and the airstrips
are short grass-and-coral strips between a volcano and the sea. Her aircraft is the
**Skylark-9 "Camar"**, a chunky single-prop bush plane she maintains herself. The wind
is up over the strait, and every landing in Teluk Arang is a short strip with the sea
on one side and a volcano on the other.

## How to play

Fly the Skylark-9 with keyboard and mouse. Pick a mission with keys **1–5** (or click
a mission row), then fly the sortie — the timer runs 240 seconds.

- **↑ / ↓** pitch · **← / →** bank · **W / S** throttle
- **Space** drops the supply crate · **G** gear · **F** flaps · **C** camera · **M** mute · **R** restart

Throttle discipline is the game: fuel burn grows with the square of the throttle, so
full throttle all the time empties the tanks before the sortie ends. Cruise at 55–65%
and the tanks last the whole 240 seconds. A steep bank bleeds speed and altitude;
below 55 knots the Skylark stalls and the nose drops until you push down and add power.
A crosswind pushes you off the centreline on final, so landings need a crab correction.

## The 5 missions

1. **Ring Run** — fly through exactly 12 rings over the strait, in order.
2. **Precision Landing** — land on the short cliff-top strip at Lighthouse Point; scored
   on touchdown vertical speed, alignment and zone. Three attempts, best counts.
3. **Supply Drop** — carry a crate to Teluk Village; fly low and slow over the marker
   and press Space. Accuracy is scored by distance from the marker.
4. **Volcano Survey** — photograph 6 checkpoints around Mount Arang, all below 1,500 ft.
5. **Island Mail Run** — touch down at all 3 airfields (Arang Bay, Lighthouse Point,
   Volcano Flats) in any order before the timer ends.

Landings are judged on three visible numbers — touchdown vertical speed, centreline
alignment and touchdown zone. A gentle, aligned, in-zone landing with gear and flaps
down scores "GREASED IT"; a hard landing adds damage and a bounce; a gear-up landing
or an overshoot adds heavy damage; striking terrain or ditching in the bay ends the
sortie with the exact cause on screen.

## How to run

No build step, no network. Serve `game/` with any static server and open
`game/index.html` in desktop Chrome:

```
node serve.ts
# open http://localhost:8080
```

All art is drawn in canvas code and all sound is synthesised with WebAudio — the game
loads nothing from the network. Staged screenshots are rendered deterministically
with `?shot=cover|flight|rings|landing&seed=1` (see `shots.json`).

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
