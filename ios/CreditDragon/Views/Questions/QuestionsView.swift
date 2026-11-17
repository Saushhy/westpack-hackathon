import SwiftUI

struct QuestionsView: View {
    @EnvironmentObject var appState: AppState
    @State private var currentIndex = 0
    @State private var cardOffset: CGFloat = 0

    private let questions = DataLoader.questions

    var body: some View {
        VStack(spacing: 0) {
            // Westpac header
            WestpacNavHeader(title: "Credit Dragon")

            // Header
            VStack(spacing: 8) {
                Text("Your Dragon's Findings")
                    .font(WestpacFont.heading(22))
                    .foregroundColor(.wbcTextHeading)

                Text("\(currentIndex + 1) of \(questions.count)")
                    .font(WestpacFont.caption())
                    .foregroundColor(.wbcTextMuted)

                // Progress dots
                HStack(spacing: 6) {
                    ForEach(0..<questions.count, id: \.self) { i in
                        Circle()
                            .fill(i <= currentIndex ? Color.wbcPrimary : Color.wbcMuted200)
                            .frame(width: 8, height: 8)
                    }
                }
            }
            .padding(.top, 20)
            .padding(.bottom, 16)

            if currentIndex < questions.count {
                QuestionCardView(
                    question: questions[currentIndex],
                    onAnswer: { answer in
                        appState.answeredQuestions[questions[currentIndex].id] = answer
                        advanceCard()
                    },
                    onSkip: { advanceCard() }
                )
                .offset(x: cardOffset)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing),
                    removal: .move(edge: .leading)
                ))
                .id(currentIndex)
            }

            Spacer()
        }
        .background(Color.wbcBackgroundPale)
    }

    private func advanceCard() {
        withAnimation(.easeInOut(duration: 0.3)) {
            cardOffset = -400
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            if currentIndex < questions.count - 1 {
                currentIndex += 1
                cardOffset = 400
                withAnimation(.easeInOut(duration: 0.3)) {
                    cardOffset = 0
                }
            } else {
                withAnimation { appState.currentScreen = .main }
            }
        }
    }
}

struct QuestionCardView: View {
    let question: AIQuestion
    let onAnswer: (String) -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(question.question)
                .font(WestpacFont.heading(18))
                .foregroundColor(.wbcTextHeading)

            // "Why am I asking?" bubble
            HStack(alignment: .top, spacing: 10) {
                Text("🐉")
                    .font(.system(size: 24))
                VStack(alignment: .leading, spacing: WestpacSpace.x05) {
                    Text("Why your dragon is asking")
                        .font(WestpacFont.body(WestpacType.s10, weight: .semibold))
                        .foregroundColor(.wbcHero)
                    Text(question.whyAsking)
                        .font(WestpacFont.body(WestpacType.s10))
                        .foregroundColor(.wbcTextBody)
                }
            }
            .padding(WestpacSpace.x2)
            .background(Color.wbcSurfaceHeroFaint)
            .clipShape(RoundedRectangle(cornerRadius: WestpacRadius.xxl))

            // Answer options
            VStack(spacing: WestpacSpace.x15) {
                ForEach(question.answerOptions) { option in
                    Button { onAnswer(option.label) } label: {
                        Text(option.label)
                            .westpacButton(.hero, size: .large, soft: true)
                    }
                }
            }

            // Impact
            HStack(spacing: 6) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundColor(.wbcSuccess)
                Text(question.impact)
                    .font(WestpacFont.caption())
                    .foregroundColor(.wbcTextMuted)
            }

            Button("Skip this question") { onSkip() }
                .font(WestpacFont.body(14))
                .foregroundColor(.wbcTextMuted)
                .frame(maxWidth: .infinity)
        }
        .westpacCard(padding: WestpacSpace.x3)
        .padding(.horizontal, WestpacSpace.x3)
    }
}
