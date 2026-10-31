// Builds the Dropp hackathon demo video: three simulator recordings side by side (Customer · Merchant ·
// Driver) on a 1920x1080 canvas, with phase titles, active-phone highlight, Aura's voice lines and
// closing slides. Usage: swift compose.swift <dir>   (expects raw-customer/seller/driver.mp4, aura-*.wav)
import AVFoundation
import AppKit
import QuartzCore

let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath
func url(_ name: String) -> URL { URL(fileURLWithPath: dir).appendingPathComponent(name) }

let W: CGFloat = 1920, H: CGFloat = 1080
let TOTAL: Double = 180            // 3:00
let PHONE_H: CGFloat = 840
let PHONE_TOP: CGFloat = 132       // top-left coordinates
let centers: [CGFloat] = [400, 960, 1520]
let bg = CGColor(red: 0.043, green: 0.071, blue: 0.125, alpha: 1)       // #0B1220
let green = CGColor(red: 0.0, green: 0.79, blue: 0.42, alpha: 1)        // Dropp green
let white = CGColor(red: 1, green: 1, blue: 1, alpha: 1)
let muted = CGColor(red: 0.62, green: 0.68, blue: 0.78, alpha: 1)

func cm(_ s: Double) -> CMTime { CMTime(seconds: s, preferredTimescale: 600) }

// ── 1. Composition: three video tracks, each held on its last frame until the end ────────────────
let comp = AVMutableComposition()
let sources = ["raw-customer.mp4", "raw-seller.mp4", "raw-driver.mp4"]
var phoneRects: [CGRect] = []          // top-left coordinate space
var layerInstructions: [AVMutableVideoCompositionLayerInstruction] = []

for (i, file) in sources.enumerated() {
    let asset = AVURLAsset(url: url(file))
    guard let src = asset.tracks(withMediaType: .video).first,
          let dst = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        fatalError("missing video in \(file)")
    }
    let dur = min(asset.duration.seconds, TOTAL)
    try! dst.insertTimeRange(CMTimeRange(start: .zero, duration: cm(dur)), of: src, at: .zero)
    if dur < TOTAL {
        // Freeze: repeat the last 0.5s and stretch it to fill the remaining time
        let tail = CMTimeRange(start: cm(dur - 0.5), duration: cm(0.5))
        try! dst.insertTimeRange(tail, of: src, at: cm(dur))
        dst.scaleTimeRange(CMTimeRange(start: cm(dur), duration: cm(0.5)), toDuration: cm(TOTAL - dur))
    }
    let size = src.naturalSize.applying(src.preferredTransform)
    let sw = abs(size.width), sh = abs(size.height)
    let s = PHONE_H / sh
    let rect = CGRect(x: centers[i] - sw * s / 2, y: PHONE_TOP, width: sw * s, height: PHONE_H)
    phoneRects.append(rect)
    let li = AVMutableVideoCompositionLayerInstruction(assetTrack: dst)
    li.setTransform(src.preferredTransform
        .concatenating(CGAffineTransform(scaleX: s, y: s))
        .concatenating(CGAffineTransform(translationX: rect.minX, y: rect.minY)), at: .zero)
    layerInstructions.append(li)
    print("\(file): \(Int(sw))x\(Int(sh)), \(String(format: "%.1f", dur))s")
}

let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: cm(TOTAL))
instruction.layerInstructions = layerInstructions
instruction.backgroundColor = bg

let videoComp = AVMutableVideoComposition()
videoComp.renderSize = CGSize(width: W, height: H)
videoComp.frameDuration = CMTime(value: 1, timescale: 30)
videoComp.instructions = [instruction]

// ── 2. Audio: Aura's voice lines where they happened in the take ─────────────────────────────────
let voiceLines: [(String, Double)] = [("aura-combo.wav", 67.0), ("aura-confirmed.wav", 90.0), ("aura-driver.wav", 107.0)]
for (file, at) in voiceLines {
    let a = AVURLAsset(url: url(file))
    guard let src = a.tracks(withMediaType: .audio).first,
          let dst = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else { continue }
    try? dst.insertTimeRange(CMTimeRange(start: .zero, duration: a.duration), of: src, at: cm(at))
}

// Narrator voiceover (narration.json: [{id, start, end, text}] → <id>.wav)
if let data = try? Data(contentsOf: url("narration.json")),
   let segs = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
    for seg in segs {
        guard let id = seg["id"] as? String, let start = seg["start"] as? Double else { continue }
        let a = AVURLAsset(url: url("\(id).wav"))
        guard let src = a.tracks(withMediaType: .audio).first,
              let dst = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else { continue }
        try? dst.insertTimeRange(CMTimeRange(start: .zero, duration: a.duration), of: src, at: cm(start))
    }
    print("narration: \(segs.count) segments")
}

// ── 3. Overlays (Core Animation, bottom-left origin) ─────────────────────────────────────────────
func bl(_ r: CGRect) -> CGRect { CGRect(x: r.minX, y: H - r.maxY, width: r.width, height: r.height) }

// Visible only during [from, to] seconds, with short fades
func visible(_ layer: CALayer, _ from: Double, _ to: Double, fade: Double = 0.35) {
    layer.opacity = 0
    let anim = CAKeyframeAnimation(keyPath: "opacity")
    let a = max(0, from), b = min(TOTAL, to)
    anim.values = [0, 0, 1, 1, 0, 0]
    anim.keyTimes = [0, a / TOTAL, min(b, a + fade) / TOTAL, max(a, b - fade) / TOTAL, b / TOTAL, 1].map { NSNumber(value: $0) }
    anim.duration = TOTAL
    anim.beginTime = AVCoreAnimationBeginTimeAtZero
    anim.isRemovedOnCompletion = false
    anim.fillMode = .both
    layer.add(anim, forKey: "visibility")
}

// Text is rendered to a bitmap: CATextLayer doesn't draw reliably inside AVFoundation export on macOS
func text(_ s: String, _ frameTL: CGRect, size: CGFloat, weight: NSFont.Weight = .regular,
          color: CGColor = white, align: CATextLayerAlignmentMode = .center) -> CALayer {
    let scale: CGFloat = 2
    let w = Int(frameTL.width * scale), h = Int(frameTL.height * scale)
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.scaleBy(x: scale, y: scale)
    let para = NSMutableParagraphStyle()
    para.alignment = align == .center ? .center : (align == .right ? .right : .left)
    para.lineSpacing = size * 0.18
    let attr = NSAttributedString(string: s, attributes: [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: NSColor(cgColor: color)!,
        .paragraphStyle: para,
    ])
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
    let bounds = attr.boundingRect(with: CGSize(width: frameTL.width, height: .greatestFiniteMagnitude),
                                   options: [.usesLineFragmentOrigin, .usesFontLeading])
    // top-aligned within the frame
    attr.draw(with: CGRect(x: 0, y: frameTL.height - ceil(bounds.height), width: frameTL.width, height: ceil(bounds.height)),
              options: [.usesLineFragmentOrigin, .usesFontLeading])
    NSGraphicsContext.restoreGraphicsState()
    let layer = CALayer()
    layer.frame = bl(frameTL)
    layer.contents = ctx.makeImage()
    layer.contentsGravity = .resize
    return layer
}

let parent = CALayer()
parent.frame = CGRect(x: 0, y: 0, width: W, height: H)
let videoLayer = CALayer()
videoLayer.frame = parent.frame
parent.addSublayer(videoLayer)

// Rounded phone corners: paint the background over everything outside the phone shapes
let mask = CAShapeLayer()
let path = CGMutablePath()
path.addRect(parent.frame)
for r in phoneRects { path.addRoundedRect(in: bl(r), cornerWidth: 46, cornerHeight: 46) }
mask.path = path
mask.fillRule = .evenOdd
mask.fillColor = bg
parent.addSublayer(mask)

// Phone outlines + active highlight
for r in phoneRects {
    let o = CALayer()
    o.frame = bl(r).insetBy(dx: -3, dy: -3)
    o.cornerRadius = 49
    o.borderWidth = 3
    o.borderColor = CGColor(red: 0.2, green: 0.25, blue: 0.33, alpha: 1)
    parent.addSublayer(o)
}
func glow(_ phone: Int, _ from: Double, _ to: Double) {
    let g = CALayer()
    g.frame = bl(phoneRects[phone]).insetBy(dx: -8, dy: -8)
    g.cornerRadius = 54
    g.borderWidth = 6
    g.borderColor = green
    g.shadowColor = green
    g.shadowRadius = 22
    g.shadowOpacity = 0.9
    g.shadowOffset = .zero
    parent.addSublayer(g)
    visible(g, from, to)
}

// Labels under phones
let labels = ["CUSTOMER", "MERCHANT", "DRIVER"]
for (i, r) in phoneRects.enumerated() {
    parent.addSublayer(text(labels[i], CGRect(x: r.midX - 200, y: r.maxY + 18, width: 400, height: 40),
                            size: 24, weight: .heavy, color: muted))
}

// Phase titles (top band)
func title(_ head: String, _ sub: String, _ from: Double, _ to: Double) {
    let h = text(head, CGRect(x: 0, y: 22, width: W, height: 58), size: 42, weight: .heavy)
    let s = text(sub, CGRect(x: 0, y: 80, width: W, height: 40), size: 24, weight: .medium, color: muted)
    parent.addSublayer(h); parent.addSublayer(s)
    visible(h, from, to); visible(s, from, to)
}

// Timeline (video time ≈ take time + 3s)
title("DROPP — One request. Multiple services.", "Customer · Merchant · Driver — three live apps on one backend", 0, 40)
title("① The Merchant", "FreshMart updates stock — Amul Butter 20 → 15, saved live to the database", 40, 60)
glow(1, 40, 60)
title("② The Customer asks Aura", "\"Cab to the airport and two cold coffees\" — one request, two services", 60, 88)
glow(0, 60, 88)
title("③ Confirm → Live Dispatch", "Ride offer reaches the driver instantly · first accept wins · OTP checked by the server", 88, 110)
glow(2, 92, 108)
title("Real-time on every screen", "Driver details, OTP and live GPS tracking update over WebSockets · food runs its own lifecycle", 110, 131)
glow(0, 108, 131)

// Closing slides
func slide(_ from: Double, _ to: Double, heading: String, cards: [(String, String)], footer: String?) {
    let s = CALayer()
    s.frame = parent.frame
    s.backgroundColor = bg
    let head = text(heading, CGRect(x: 0, y: 110, width: W, height: 90), size: 64, weight: .heavy)
    s.addSublayer(head)
    let cw: CGFloat = 520, gap: CGFloat = 40
    let startX = (W - (CGFloat(cards.count) * cw + CGFloat(cards.count - 1) * gap)) / 2
    for (i, c) in cards.enumerated() {
        let x = startX + CGFloat(i) * (cw + gap)
        let card = CALayer()
        card.frame = bl(CGRect(x: x, y: 270, width: cw, height: 470))
        card.backgroundColor = CGColor(red: 0.08, green: 0.12, blue: 0.19, alpha: 1)
        card.cornerRadius = 28
        card.borderWidth = 2
        card.borderColor = CGColor(red: 0.0, green: 0.79, blue: 0.42, alpha: 0.6)
        s.addSublayer(card)
        s.addSublayer(text(c.0, CGRect(x: x + 36, y: 310, width: cw - 72, height: 110), size: 38, weight: .heavy, color: green, align: .left))
        s.addSublayer(text(c.1, CGRect(x: x + 36, y: 430, width: cw - 72, height: 290), size: 28, weight: .regular, align: .left))
    }
    if let f = footer {
        s.addSublayer(text(f, CGRect(x: 0, y: 800, width: W, height: 160), size: 40, weight: .bold, color: muted))
    }
    parent.addSublayer(s)
    visible(s, from, to, fade: 0.6)
}

slide(131, 157, heading: "What makes Dropp different",
      cards: [
        ("Aura", "Natural language in Hindi, Hinglish or English becomes structured requests — even when one sentence needs more than one service."),
        ("Orchestration", "Ride and food keep their own lifecycles and rules. Dropp coordinates the experience — and handles a failure in one service without breaking the other."),
        ("Real-time backbone", "Server-validated prices and availability, atomic dispatch, server-checked OTP, and live WebSocket events to every app. Plus an MCP layer so any AI agent can use Dropp."),
      ],
      footer: nil)
slide(157, 180, heading: "Business & Vision",
      cards: [
        ("Merchants", "Reach nearby customers and run the store by voice — stock, prices and orders."),
        ("Partners & customers", "More relevant demand across rides, food and parcels. One request instead of many apps."),
        ("Model & next steps", "Transaction commissions and service fees, validated through real usage. Next: more local services and ONDC where it makes sense."),
      ],
      footer: "Dropp: One request. Multiple services. A simpler everyday life.")

videoComp.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parent)

// ── 4. Export ────────────────────────────────────────────────────────────────────────────────────
let out = url("Dropp-Hackathon-Demo.mp4")
try? FileManager.default.removeItem(at: out)
guard let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPreset1920x1080) else { fatalError("no export session") }
export.outputURL = out
export.outputFileType = .mp4
export.videoComposition = videoComp
export.timeRange = CMTimeRange(start: .zero, duration: cm(TOTAL))
let done = DispatchSemaphore(value: 0)
let started = Date()
export.exportAsynchronously { done.signal() }
while done.wait(timeout: .now() + 5) == .timedOut {
    print(String(format: "  exporting… %.0f%%", export.progress * 100))
}
if export.status == .completed {
    print(String(format: "Done in %.0fs → %@", Date().timeIntervalSince(started), out.path))
} else {
    print("Export failed: \(export.error?.localizedDescription ?? "unknown")")
    exit(1)
}
