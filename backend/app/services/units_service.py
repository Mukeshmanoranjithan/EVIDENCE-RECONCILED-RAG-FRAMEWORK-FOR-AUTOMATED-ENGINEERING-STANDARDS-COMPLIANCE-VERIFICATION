from typing import Optional, Tuple, Union
import pint

# Initialize Pint UnitRegistry with offset temperature definitions
ureg = pint.UnitRegistry()
Q_ = ureg.Quantity

# Unit synonym normalization map
UNIT_ALIASES = {
    "c": "degC",
    "°c": "degC",
    "celsius": "degC",
    "f": "degF",
    "°f": "degF",
    "fahrenheit": "degF",
    "k": "kelvin",
    "kelvin": "kelvin",
    "v": "volt",
    "volt": "volt",
    "volts": "volt",
    "mv": "millivolt",
    "kv": "kilovolt",
    "a": "ampere",
    "amp": "ampere",
    "amps": "ampere",
    "ma": "milliampere",
    "kg": "kilogram",
    "g": "gram",
    "mg": "milligram",
    "lb": "pound",
    "lbs": "pound",
    "m": "meter",
    "mm": "millimeter",
    "cm": "centimeter",
    "in": "inch",
    "ft": "foot",
    "pa": "pascal",
    "kpa": "kilopascal",
    "mpa": "megapascal",
    "bar": "bar",
    "psi": "psi",
    "db": "decibel",
    "dba": "decibel",
}

def normalize_unit_str(unit_str: Optional[str]) -> Optional[str]:
    if not unit_str:
        return None
    cleaned = unit_str.strip().lower()
    return UNIT_ALIASES.get(cleaned, unit_str.strip())

def are_units_compatible(unit1: Optional[str], unit2: Optional[str]) -> bool:
    """Checks if two units belong to the same physical dimension."""
    if not unit1 and not unit2:
        return True
    if not unit1 or not unit2:
        return False
        
    u1 = normalize_unit_str(unit1)
    u2 = normalize_unit_str(unit2)
    
    # Decibels are dimensionless/logarithmic, handle specially
    if "decibel" in (u1, u2):
        return u1 == u2
        
    try:
        q1 = ureg.Quantity(1, u1)
        q2 = ureg.Quantity(1, u2)
        return q1.dimensionality == q2.dimensionality
    except Exception:
        return False

def convert_value(val: float, from_unit: Optional[str], to_unit: Optional[str]) -> Tuple[float, str]:
    """
    Converts a numeric value from from_unit to to_unit using Pint.
    Returns (converted_value, formula_or_trail).
    """
    if not from_unit and not to_unit:
        return val, f"{val}"
    if from_unit == to_unit:
        return val, f"{val} {to_unit}"
        
    u_from = normalize_unit_str(from_unit)
    u_to = normalize_unit_str(to_unit)
    
    if not u_from or not u_to:
        raise ValueError(f"Cannot convert missing unit: {from_unit} to {to_unit}")
        
    # Handle decibels / dimensionless
    if "decibel" in (u_from, u_to):
        if u_from == u_to:
            return val, f"{val} {to_unit}"
        raise ValueError(f"Incompatible unit conversion: {from_unit} to {to_unit}")
        
    try:
        q_src = ureg.Quantity(val, u_from)
        q_dest = q_src.to(u_to)
        dest_val = float(q_dest.magnitude)
        
        # Format transparent formula
        if u_from == "degF" and u_to == "degC":
            trail = f"({val} - 32) * 5/9 = {dest_val:.2f} °C"
        elif u_from == "degC" and u_to == "degF":
            trail = f"({val} * 9/5) + 32 = {dest_val:.2f} °F"
        else:
            trail = f"{val} {from_unit} = {dest_val:.4g} {to_unit}"
            
        return dest_val, trail
    except Exception as e:
        raise ValueError(f"Pint conversion error between '{from_unit}' and '{to_unit}': {e}")

def calculate_deviation(actual: float, limit: float) -> Tuple[float, float, str]:
    """
    Calculates absolute difference and percentage deviation:
    diff = actual - limit
    pct_dev = ((actual - limit) / abs(limit)) * 100
    Returns (diff, pct_dev, formula_str)
    """
    diff = actual - limit
    if abs(limit) > 1e-9:
        pct_dev = (diff / abs(limit)) * 100.0
        formula = f"({actual:.4g} - {limit:.4g}) / {abs(limit):.4g} * 100 = {pct_dev:+.2f}%"
    else:
        pct_dev = 0.0
        formula = f"{actual:.4g} - {limit:.4g} = {diff:+.4g}"
    return diff, pct_dev, formula

