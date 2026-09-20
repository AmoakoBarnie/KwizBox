<?php
/**
 * Question type helpers — option packing, validation, MCQ/TF/Image constants.
 */

if (!defined('MCQ')) define('MCQ', 'mcq');
if (!defined('TRUE_FALSE')) define('TRUE_FALSE', 'true_false');
if (!defined('IMAGE_MCQ')) define('IMAGE_MCQ', 'image_mcq');

const QUESTION_TYPES = [MCQ, TRUE_FALSE, IMAGE_MCQ];

/**
 * Get public options for a question (true_false = 2 options, else 4).
 */
function publicOptions(string $questionType, string $a, string $b, string $c, string $d): array {
    $type = $questionType ?: MCQ;
    if ($type === TRUE_FALSE) {
        return [$a ?: 'True', $b ?: 'False'];
    }
    return [$a, $b, $c, $d];
}

/**
 * Validate and pad options to 4 values for storage.
 * - true_false: needs exactly 2, returns [a, b, '', '']
 * - mcq/image_mcq: needs exactly 4
 */
function padOptions(string $questionType, array $options): array {
    $opts = [];
    foreach (($options ?: []) as $o) {
        $opts[] = ($o === null) ? '' : trim((string) $o);
    }
    $type = $questionType ?: MCQ;
    if ($type === TRUE_FALSE) {
        $filled = array_values(array_filter($opts, fn($o) => $o !== ''));
        if (count($filled) >= 2) {
            [$a, $b] = [$filled[0], $filled[1]];
        } elseif (count($opts) >= 2) {
            [$a, $b] = [$opts[0] ?: 'True', $opts[1] ?: 'False'];
        } else {
            [$a, $b] = ['True', 'False'];
        }
        return [$a, $b, '', ''];
    }
    while (count($opts) < 4) $opts[] = '';
    return array_slice($opts, 0, 4);
}

/**
 * Validate question fields. Returns the (possibly cleaned) question type.
 * Throws HTTPException-like error via Response::error on failure.
 */
function validateQuestionFields(string $questionType, array $options, int $answerIndex, ?string $imageUrl, bool $requireImage = false): string {
    $qtype = strtolower(trim($questionType ?: MCQ));
    if (!in_array($qtype, QUESTION_TYPES, true)) {
        Response::error('question_type must be one of: ' . implode(', ', QUESTION_TYPES), 400);
    }
    $opts = [];
    foreach (($options ?: []) as $o) {
        $opts[] = ($o === null) ? '' : trim((string) $o);
    }
    if ($qtype === TRUE_FALSE) {
        $filled = array_values(array_filter($opts, fn($o) => $o !== ''));
        if (count($opts) === 2) {
            if (!$opts[0] || !$opts[1]) {
                Response::error('true_false requires two non-empty options', 400);
            }
        } elseif (count($filled) !== 2) {
            Response::error('true_false requires exactly 2 options (True/False)', 400);
        }
        if (!in_array($answerIndex, [0, 1], true)) {
            Response::error('true_false answer_index must be 0 (True) or 1 (False)', 400);
        }
    } else {
        if (count($opts) !== 4 || count(array_filter($opts)) !== 4) {
            Response::error("$qtype requires exactly 4 non-empty options", 400);
        }
        if ($answerIndex < 0 || $answerIndex > 3) {
            Response::error('answer_index must be 0-3', 400);
        }
        if ($qtype === IMAGE_MCQ && $requireImage && empty(trim($imageUrl ?? ''))) {
            Response::error('image_mcq requires image_url', 400);
        }
    }
    return $qtype;
}
