<?php
/**
 * JSON question seeder for KwizBox MySQL.
 * Usage: php seed_questions.php
 *
 * Reads ../scripts/questions.json and inserts into the questions table.
 * Expects questions.json format: [{id, class_level, subject, topic, sub_topic, strand, difficulty, question, options: [...], answer_index, explanation, question_type?, image_url?}, ...]
 * Option columns: option_a..option_d (option_c/d empty for true_false)
 */

require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/QuestionTypes.php';
require_once __DIR__ . '/config.php';

$jsonPath = dirname(__DIR__) . '/scripts/questions.json';
if (!file_exists($jsonPath)) {
    echo "questions.json not found at: $jsonPath\n";
    exit(1);
}

$data = json_decode(file_get_contents($jsonPath), true);
if (!is_array($data)) {
    echo "Invalid JSON in questions.json\n";
    exit(1);
}
echo "Loaded " . count($data) . " questions from $jsonPath\n";

// Start transaction for speed
$pdo = Database::connection();
$pdo->beginTransaction();

try {
    // Clear existing
    $pdo->exec('DELETE FROM questions');
    echo "Cleared existing questions.\n";

    $inserted = 0;
    foreach ($data as $q) {
        $id = (int) $q['id'];
        $qtype = validateQuestionFields(
            $q['question_type'] ?? MCQ,
            $q['options'] ?? [],
            (int) $q['answer_index'],
            $q['image_url'] ?? null,
            false
        );
        $opts = padOptions($qtype, $q['options'] ?? []);

        Database::execute(
            'INSERT INTO questions (id, class_level, subject, topic, sub_topic, strand, difficulty, question, option_a, option_b, option_c, option_d, answer_index, explanation, question_type, image_url, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
            [
                $id,
                $q['class_level'],
                $q['subject'],
                $q['topic'],
                $q['sub_topic'] ?? null,
                $q['strand'],
                $q['difficulty'],
                $q['question'],
                $opts[0], $opts[1], $opts[2], $opts[3],
                (int) $q['answer_index'],
                $q['explanation'],
                $qtype,
                $q['image_url'] ?? null,
            ]
        );
        $inserted++;
    }

    // Insert demo T/F + image questions (same as Python backend)
    $demoTFSQ = 'A lever is a simple machine that can make it easier to lift a load.';
    $demoComputerSQ = 'Look at the diagram. Which simple machine is shown?';
    $demoPartsSQ = 'Look at the labelled diagram. Which part is used to type letters and numbers?';

    $existingStems = Database::fetchAll('SELECT question FROM questions');
    $existingSet = array_column($existingStems, 'question');

    $demoRows = [
        [
            'class_level' => 'B4', 'subject' => 'Science', 'topic' => 'Forces and machines',
            'strand' => 'Diversity of matter', 'difficulty' => 'Easy',
            'question' => $demoTFSQ,
            'option_a' => 'True', 'option_b' => 'False', 'option_c' => '', 'option_d' => '',
            'answer_index' => 0,
            'explanation' => 'A lever is one of the simple machines. A see-saw and a crowbar are everyday levers.',
            'question_type' => TRUE_FALSE, 'image_url' => null,
        ],
        [
            'class_level' => 'B4', 'subject' => 'Science', 'topic' => 'Forces and machines',
            'strand' => 'Forces and energy', 'difficulty' => 'Easy',
            'question' => $demoComputerSQ,
            'option_a' => 'Lever', 'option_b' => 'Pulley', 'option_c' => 'Inclined plane', 'option_d' => 'Wheel and axle',
            'answer_index' => 0,
            'explanation' => 'The diagram shows a lever: a rigid bar that turns on a fulcrum to lift a load.',
            'question_type' => IMAGE_MCQ, 'image_url' => '/media/questions/lever.svg',
        ],
        [
            'class_level' => 'B4', 'subject' => 'Computing', 'topic' => 'Computer hardware',
            'strand' => 'Introduction to computing', 'difficulty' => 'Easy',
            'question' => $demoPartsSQ,
            'option_a' => 'Monitor', 'option_b' => 'Keyboard', 'option_c' => 'Mouse', 'option_d' => 'CPU (system unit)',
            'answer_index' => 1,
            'explanation' => 'The keyboard is the input device used to type letters, numbers and symbols.',
            'question_type' => IMAGE_MCQ, 'image_url' => '/media/questions/computer-parts.svg',
        ],
    ];

    $demoCount = 0;
    foreach ($demoRows as $row) {
        if (in_array($row['question'], $existingSet, true)) continue;
        Database::execute(
            'INSERT INTO questions (class_level, subject, topic, sub_topic, strand, difficulty, question, option_a, option_b, option_c, option_d, answer_index, explanation, question_type, image_url, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
            [
                $row['class_level'], $row['subject'], $row['topic'], null, $row['strand'],
                $row['difficulty'], $row['question'],
                $row['option_a'], $row['option_b'], $row['option_c'], $row['option_d'],
                $row['answer_index'], $row['explanation'], $row['question_type'], $row['image_url'],
            ]
        );
        $demoCount++;
    }

    $pdo->commit();
    echo "Seeded $inserted questions (+ $demoCount type-demo placeholders).\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
