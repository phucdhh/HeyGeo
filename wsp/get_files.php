<?php
$filter = $_POST['filter'];
foreach (glob($filter) as $file) {
  $files[] = $file;
}
header('Content-Type: application/json');
echo json_encode($files); // return value of $result
?>