"""
Multi-Currency Payroll Support
==============================
Provides currency conversion and multi-currency payroll calculations.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import httpx

router = APIRouter(prefix="/currency", tags=["currency"])

# Supported currencies with symbols
SUPPORTED_CURRENCIES = {
    "USD": {"symbol": "$", "name": "US Dollar"},
    "EUR": {"symbol": "€", "name": "Euro"},
    "GBP": {"symbol": "£", "name": "British Pound"},
    "CAD": {"symbol": "C$", "name": "Canadian Dollar"},
    "AUD": {"symbol": "A$", "name": "Australian Dollar"},
    "INR": {"symbol": "₹", "name": "Indian Rupee"},
    "JPY": {"symbol": "¥", "name": "Japanese Yen"},
    "CNY": {"symbol": "¥", "name": "Chinese Yuan"},
    "BRL": {"symbol": "R$", "name": "Brazilian Real"},
    "MXN": {"symbol": "$", "name": "Mexican Peso"},
    "SGD": {"symbol": "S$", "name": "Singapore Dollar"},
    "CHF": {"symbol": "CHF", "name": "Swiss Franc"},
    "NZD": {"symbol": "NZ$", "name": "New Zealand Dollar"},
    "SEK": {"symbol": "kr", "name": "Swedish Krona"},
    "NOK": {"symbol": "kr", "name": "Norwegian Krone"},
    "DKK": {"symbol": "kr", "name": "Danish Krone"},
    "ZAR": {"symbol": "R", "name": "South African Rand"},
    "AED": {"symbol": "د.إ", "name": "UAE Dirham"},
    "PHP": {"symbol": "₱", "name": "Philippine Peso"},
    "PLN": {"symbol": "zł", "name": "Polish Zloty"},
}

# Cache for exchange rates (updated every hour)
exchange_rate_cache = {
    "rates": {},
    "last_updated": None
}

class CurrencyConversion(BaseModel):
    amount: float
    from_currency: str = "USD"
    to_currency: str

class PayrollCurrencySettings(BaseModel):
    base_currency: str = "USD"
    employee_currencies: dict = {}  # user_id -> currency_code

@router.get("/supported")
async def get_supported_currencies():
    """Get list of supported currencies"""
    return {
        "currencies": [
            {"code": code, **info}
            for code, info in SUPPORTED_CURRENCIES.items()
        ]
    }

@router.get("/rates")
async def get_exchange_rates(base: str = "USD"):
    """Get current exchange rates"""
    if base not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported base currency: {base}")
    
    # Check cache (refresh hourly)
    now = datetime.now(timezone.utc)
    if (exchange_rate_cache["last_updated"] and 
        (now - exchange_rate_cache["last_updated"]).seconds < 3600 and
        exchange_rate_cache.get("base") == base):
        return {
            "base": base,
            "rates": exchange_rate_cache["rates"],
            "last_updated": exchange_rate_cache["last_updated"].isoformat()
        }
    
    # Fetch fresh rates (using free API)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.exchangerate-api.com/v4/latest/{base}",
                timeout=10.0
            )
            data = response.json()
            
            # Filter to supported currencies only
            rates = {
                code: data["rates"].get(code, 1.0)
                for code in SUPPORTED_CURRENCIES.keys()
            }
            
            exchange_rate_cache["rates"] = rates
            exchange_rate_cache["base"] = base
            exchange_rate_cache["last_updated"] = now
            
            return {
                "base": base,
                "rates": rates,
                "last_updated": now.isoformat()
            }
    except Exception as e:
        # Return cached rates if available, otherwise fallback rates
        if exchange_rate_cache["rates"]:
            return {
                "base": base,
                "rates": exchange_rate_cache["rates"],
                "last_updated": exchange_rate_cache["last_updated"].isoformat(),
                "cached": True
            }
        
        # Fallback static rates (approximate)
        return {
            "base": "USD",
            "rates": {
                "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "CAD": 1.36,
                "AUD": 1.53, "INR": 83.12, "JPY": 149.50, "CNY": 7.24,
                "BRL": 4.97, "MXN": 17.15, "SGD": 1.34, "CHF": 0.88,
                "NZD": 1.63, "SEK": 10.42, "NOK": 10.52, "DKK": 6.87,
                "ZAR": 18.62, "AED": 3.67, "PHP": 55.50, "PLN": 4.02
            },
            "fallback": True
        }

@router.post("/convert")
async def convert_currency(conversion: CurrencyConversion):
    """Convert amount between currencies"""
    if conversion.from_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {conversion.from_currency}")
    if conversion.to_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {conversion.to_currency}")
    
    rates_data = await get_exchange_rates(conversion.from_currency)
    rates = rates_data["rates"]
    
    converted_amount = conversion.amount * rates.get(conversion.to_currency, 1.0)
    
    return {
        "original": {
            "amount": conversion.amount,
            "currency": conversion.from_currency,
            "symbol": SUPPORTED_CURRENCIES[conversion.from_currency]["symbol"]
        },
        "converted": {
            "amount": round(converted_amount, 2),
            "currency": conversion.to_currency,
            "symbol": SUPPORTED_CURRENCIES[conversion.to_currency]["symbol"]
        },
        "rate": rates.get(conversion.to_currency, 1.0)
    }

@router.post("/payroll/settings")
async def update_payroll_currency_settings(
    request: Request,
    settings: PayrollCurrencySettings
):
    """Update company payroll currency settings"""
    db = request.app.state.db
    
    # Validate currencies
    if settings.base_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported base currency")
    
    for user_id, currency in settings.employee_currencies.items():
        if currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(status_code=400, detail=f"Unsupported currency for user {user_id}")
    
    # Update company settings
    await db.company_settings.update_one(
        {"setting_type": "payroll_currency"},
        {
            "$set": {
                "base_currency": settings.base_currency,
                "employee_currencies": settings.employee_currencies,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"status": "updated", "settings": settings.dict()}

@router.get("/payroll/settings")
async def get_payroll_currency_settings(request: Request):
    """Get company payroll currency settings"""
    db = request.app.state.db
    
    settings = await db.company_settings.find_one(
        {"setting_type": "payroll_currency"},
        {"_id": 0}
    )
    
    if not settings:
        return {
            "base_currency": "USD",
            "employee_currencies": {}
        }
    
    return {
        "base_currency": settings.get("base_currency", "USD"),
        "employee_currencies": settings.get("employee_currencies", {})
    }

@router.post("/payroll/calculate-multi")
async def calculate_multi_currency_payroll(
    request: Request,
    period_start: str,
    period_end: str
):
    """Calculate payroll in multiple currencies based on employee preferences"""
    db = request.app.state.db
    
    # Get currency settings
    settings = await get_payroll_currency_settings(request)
    base_currency = settings["base_currency"]
    employee_currencies = settings["employee_currencies"]
    
    # Get exchange rates
    rates_data = await get_exchange_rates(base_currency)
    rates = rates_data["rates"]
    
    # Get payroll data
    payroll = await db.payroll.find({
        "period_start": {"$gte": period_start},
        "period_end": {"$lte": period_end}
    }, {"_id": 0}).to_list(1000)
    
    # Convert to employee currencies
    multi_currency_payroll = []
    for record in payroll:
        user_id = record.get("user_id")
        target_currency = employee_currencies.get(user_id, base_currency)
        rate = rates.get(target_currency, 1.0)
        
        # Convert amounts
        converted_record = {
            **record,
            "original_currency": base_currency,
            "payment_currency": target_currency,
            "exchange_rate": rate,
            "original_gross": record.get("gross_pay", 0),
            "original_net": record.get("net_pay", 0),
            "converted_gross": round(record.get("gross_pay", 0) * rate, 2),
            "converted_net": round(record.get("net_pay", 0) * rate, 2),
            "currency_symbol": SUPPORTED_CURRENCIES.get(target_currency, {}).get("symbol", "$")
        }
        multi_currency_payroll.append(converted_record)
    
    return {
        "base_currency": base_currency,
        "rates_date": rates_data.get("last_updated"),
        "payroll": multi_currency_payroll
    }
