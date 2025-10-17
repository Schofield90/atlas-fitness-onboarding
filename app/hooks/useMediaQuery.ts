'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook to handle CSS media queries in React components
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns boolean - whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query)
      
      // Set initial value
      setMatches(media.matches)

      // Create event listener function
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches)
      }

      // Add event listener
      if (media.addEventListener) {
        media.addEventListener('change', listener)
      } else {
        // Fallback for older browsers
        media.addListener(listener)
      }

      // Cleanup function
      return () => {
        if (media.removeEventListener) {
          media.removeEventListener('change', listener)
        } else {
          // Fallback for older browsers
          media.removeListener(listener)
        }
      }
    }
  }, [query])

  return matches
}

/**
 * Predefined breakpoint hooks for common screen sizes
 */
export const useBreakpoints = () => {
  const isXs = useMediaQuery('(max-width: 475px)')
  const isSm = useMediaQuery('(max-width: 640px)')
  const isMd = useMediaQuery('(max-width: 768px)')
  const isLg = useMediaQuery('(max-width: 1024px)')
  const isXl = useMediaQuery('(max-width: 1280px)')
  const is2Xl = useMediaQuery('(max-width: 1536px)')

  const isMobile = isSm
  const isTablet = isMd && !isSm
  const isDesktop = !isMd

  return {
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint: isXs ? 'xs' : isSm ? 'sm' : isMd ? 'md' : isLg ? 'lg' : isXl ? 'xl' : '2xl'
  }
}

/**
 * Hook to detect device type based on screen size and touch capability
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px) and (min-width: 769px)')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      if (isMobile) {
        setDeviceType('mobile')
      } else if (isTablet || (isTouchDevice && !isMobile)) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }
  }, [isMobile, isTablet])

  return deviceType
}

/**
 * Hook to get current viewport dimensions
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateViewport = () => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }

      // Set initial values
      updateViewport()

      // Add event listener
      window.addEventListener('resize', updateViewport)

      // Cleanup
      return () => window.removeEventListener('resize', updateViewport)
    }
  }, [])

  return viewport
}