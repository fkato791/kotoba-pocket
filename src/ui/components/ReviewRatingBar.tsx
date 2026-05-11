import { StyleSheet, View } from "react-native";
import type { ReviewRating } from "@/domain/models";
import { AppButton } from "@/ui/components/AppButton";
import { spacing } from "@/ui/theme";

const labels: Record<ReviewRating, string> = {
  again: "もう一度",
  hard: "むずかしい",
  good: "できた",
  easy: "かんたん"
};

interface ReviewRatingBarProps {
  onRate: (rating: ReviewRating) => void;
}

export function ReviewRatingBar({ onRate }: ReviewRatingBarProps): JSX.Element {
  return (
    <View style={styles.grid}>
      {(Object.keys(labels) as ReviewRating[]).map(rating => (
        <AppButton key={rating} label={labels[rating]} variant="secondary" onPress={() => onRate(rating)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm
  }
});
