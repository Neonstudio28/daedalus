// Renders a local HTML file to a PNG of an exact pixel size using WebKit.
// Usage: swift brand-src/render.swift <input.html> <output.png> <width> <height>
import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count == 5, let w = Int(args[3]), let h = Int(args[4]) else {
  FileHandle.standardError.write("usage: render.swift in.html out.png width height\n".data(using: .utf8)!); exit(2)
}
let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let input = URL(fileURLWithPath: args[1], relativeTo: cwd).standardizedFileURL
let output = URL(fileURLWithPath: args[2], relativeTo: cwd).standardizedFileURL

final class Renderer: NSObject, WKNavigationDelegate {
  let web: WKWebView
  let window: NSWindow
  let w: Int, h: Int, output: URL
  init(width: Int, height: Int, output: URL) {
    self.w = width; self.h = height; self.output = output
    let frame = NSRect(x: 0, y: 0, width: width, height: height)
    web = WKWebView(frame: frame, configuration: WKWebViewConfiguration())
    web.setValue(false, forKey: "drawsBackground")
    window = NSWindow(contentRect: frame, styleMask: [.borderless], backing: .buffered, defer: false)
    window.contentView = web
    super.init()
    web.navigationDelegate = self
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    webView.callAsyncJavaScript("await document.fonts.ready; await new Promise(r => setTimeout(r, 400)); return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',');",
                                arguments: [:], in: nil, in: .page) { result in
      if case .success(let fams) = result { print("fonts loaded:", fams as? String ?? "") }
      let cfg = WKSnapshotConfiguration()
      cfg.snapshotWidth = NSNumber(value: self.w)
      let w = self.w, h = self.h, output = self.output
      webView.takeSnapshot(with: cfg) { image, err in
        guard let image = image else { print("snapshot failed:", err as Any); exit(1) }
        let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                                   samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                   colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        rep.size = NSSize(width: w, height: h)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
        NSGraphicsContext.current?.imageInterpolation = .high
        image.draw(in: NSRect(x: 0, y: 0, width: w, height: h))
        NSGraphicsContext.restoreGraphicsState()
        try! rep.representation(using: .png, properties: [:])!.write(to: output)
        print("wrote", output.path, "\(w)x\(h)")
        exit(0)
      }
    }
  }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { print(error); exit(1) }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let r = Renderer(width: w, height: h, output: output)
r.web.loadFileURL(input, allowingReadAccessTo: input.deletingLastPathComponent().deletingLastPathComponent())
DispatchQueue.main.asyncAfter(deadline: .now() + 30) { print("timeout"); exit(1) }
app.run()
