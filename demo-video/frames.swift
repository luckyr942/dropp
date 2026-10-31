import AVFoundation
import AppKit
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 1280, height: 720)
for s in CommandLine.arguments.dropFirst(2) {
    let t = CMTime(seconds: Double(s)!, preferredTimescale: 600)
    if let img = try? gen.copyCGImage(at: t, actualTime: nil) {
        let rep = NSBitmapImageRep(cgImage: img)
        try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!.write(to: URL(fileURLWithPath: "frames/f\(s).jpg"))
    }
}
