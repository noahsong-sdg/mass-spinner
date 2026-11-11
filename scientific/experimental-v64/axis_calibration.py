"""Linear PDF-coordinate calibration from measured tick positions, not frames."""
import math


def tick_value(position, ticks):
    if len(ticks) < 2 or not all(math.isfinite(v) for pair in ticks for v in pair):
        raise ValueError('Need at least two finite axis ticks')
    first, last = ticks[0], ticks[-1]
    if first[0] == last[0] or first[1] == last[1] or not math.isfinite(position):
        raise ValueError('Axis coordinate and signal need a nonzero finite span')
    slope = (last[1]-first[1])/(last[0]-first[0])
    def value(x):
        return first[1]+slope*(x-first[0])
    if any(abs(value(x)-y) > 1e-5*abs(last[1]-first[1]) for x, y in ticks):
        raise ValueError('Ticks do not define one linear axis')
    return value(position)
