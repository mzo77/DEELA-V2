// DEELA iOS release icon generator.
// Generates owned D-monogram icons for the existing Xcode asset catalogue.
// Run on macOS before any release build: swift scripts/ios-distribution/generate-deela-app-icon.swift
import AppKit
import Foundation

let side = 1024
let folder = URL(fileURLWithPath: "Feather/Resources/Assets.xcassets/AppIcon.appiconset", isDirectory: true)

struct Appearance {
    let fileName: String
    let start: NSColor
    let end: NSColor
    let ink: NSColor
}

let variants: [Appearance] = [
    Appearance(fileName: "feather.png",
               start: NSColor(calibratedRed: 0.98, green: 0.24, blue: 0.46, alpha: 1),
               end: NSColor(calibratedRed: 0.35, green: 0.12, blue: 0.43, alpha: 1),
               ink: .white),
    Appearance(fileName: "feather_dark.png",
               start: NSColor(calibratedRed: 0.33, green: 0.15, blue: 0.37, alpha: 1),
               end: NSColor(calibratedRed: 0.07, green: 0.08, blue: 0.15, alpha: 1),
               ink: .white),
    Appearance(fileName: "feather_tint.png",
               start: NSColor(calibratedWhite: 0.40, alpha: 1),
               end: NSColor(calibratedWhite: 0.11, alpha: 1),
               ink: .white)
]

for appearance in variants {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: side,
        pixelsHigh: side,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fatalError("Cannot create DEELA icon bitmap")
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphics

    let frame = NSRect(x: 0, y: 0, width: side, height: side)
    let background = NSBezierPath(rect: frame)
    NSGradient(starting: appearance.start, ending: appearance.end)?.draw(in: background, angle: 130)

    let circle = NSBezierPath(ovalIn: NSRect(x: 113, y: 120, width: 798, height: 798))
    NSColor.white.withAlphaComponent(0.10).setStroke()
    circle.lineWidth = 17
    circle.stroke()

    let shadow = NSShadow()
    shadow.shadowBlurRadius = 36
    shadow.shadowOffset = NSSize(width: 0, height: -12)
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.28)
    shadow.set()

    let monogram = NSAttributedString(string: "D", attributes: [
        .font: NSFont.systemFont(ofSize: 676, weight: .black),
        .foregroundColor: appearance.ink
    ])
    let size = monogram.size()
    monogram.draw(at: NSPoint(x: (CGFloat(side) - size.width) / 2,
                              y: (CGFloat(side) - size.height) / 2 - 9))

    graphics.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()

    guard let data = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Cannot encode DEELA icon")
    }
    try data.write(to: folder.appendingPathComponent(appearance.fileName), options: .atomic)
    print("Generated DEELA iOS icon \(appearance.fileName): \(data.count) bytes")
}
