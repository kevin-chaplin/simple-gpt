import React from "react"

export function Favicon() {
  return (
    <>
      {/* Standard favicon */}
      <link rel="icon" href="/icons8-brain-blue-ui-32.png" sizes="32x32" />
      <link rel="icon" href="/icons8-brain-blue-ui-96.png" sizes="96x96" />
      <link rel="icon" href="/icons8-brain-blue-ui-16.png" sizes="16x16" />
      
      {/* Apple Touch Icon (for iOS devices) */}
      <link rel="apple-touch-icon" href="/icons8-brain-blue-ui-96.png" />
      
      {/* Windows Tile Icon */}
      <meta name="msapplication-TileImage" content="/icons8-brain-blue-ui-96.png" />
      
      {/* For modern browsers that support SVG favicons */}
      <link rel="icon" type="image/png" href="/icons8-brain-blue-ui-96.png" />
    </>
  )
}
