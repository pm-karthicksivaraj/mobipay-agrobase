import { getTenantContext } from '@/lib/tenant'
import { getCountryRiskProfile, getAllCountryProfiles } from '@/lib/eudr/risk-scoring'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext()
    const { searchParams } = new URL(request.url)

    const country = searchParams.get('country')

    // Single country profile
    if (country) {
      const profile = getCountryRiskProfile(country)
      return NextResponse.json(profile)
    }

    // All country profiles
    const profiles = getAllCountryProfiles()

    // Enrich with proximity data if centroid is provided
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    let proximityData: { country: string; distanceKm: number } | null = null

    if (lat && lng) {
      const centroid = { lat: parseFloat(lat), lng: parseFloat(lng) }
      // Find the best-matching country based on operational region
      let nearestCountry = 'UG' // default
      const latVal = centroid.lat
      const lngVal = centroid.lng

      // Simple geographic heuristic for our 3 operational countries
      if (latVal > -2 && latVal < 5 && lngVal > 28 && lngVal < 36) {
        nearestCountry = 'UG' // Uganda
      } else if (latVal > 4 && latVal < 12 && lngVal > -4 && lngVal < 2) {
        nearestCountry = 'GH' // Ghana
      } else if (latVal > -5 && latVal < 6 && lngVal > 33 && lngVal < 43) {
        nearestCountry = 'KE' // Kenya
      }

      const matchedProfile = profiles.find((p) => p.countryCode === nearestCountry)
      proximityData = {
        country: nearestCountry,
        distanceKm: matchedProfile ? 0 : -1,
      }
    }

    return NextResponse.json({
      profiles,
      proximity: proximityData,
      supportedCountries: profiles.map((p) => p.countryCode),
    })
  } catch (error) {
    console.error('EUDR country profiles error:', error)
    return NextResponse.json({ error: 'Failed to fetch country profiles' }, { status: 500 })
  }
}