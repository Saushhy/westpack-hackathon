import Foundation

struct DataLoader {
    static func load<T: Decodable>(_ filename: String) -> T {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            fatalError("Missing \(filename).json in bundle")
        }
        guard let data = try? Data(contentsOf: url) else {
            fatalError("Cannot read \(filename).json")
        }
        guard let decoded = try? JSONDecoder().decode(T.self, from: data) else {
            fatalError("Cannot decode \(filename).json as \(T.self)")
        }
        return decoded
    }

    static var transactions: [Transaction] { load("transactions") }
    static var questions: [AIQuestion] { load("questions") }
    static var bills: [Bill] { load("bills") }
    static var insights: [CreditInsight] { load("insights") }
    static var goals: [CreditGoal] { load("goals") }
}
