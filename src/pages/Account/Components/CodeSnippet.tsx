import {
  Box,
  Button,
  CircularProgress,
  Link,
  Modal,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {ContentCopy, OpenInFull} from "@mui/icons-material";
import SyntaxHighlighter from "react-syntax-highlighter";
import {
  getBytecodeSizeInKB,
  getPublicFunctionLineNumber,
  transformCode,
} from "../../../utils";
import React, {useEffect, useRef, useState} from "react";
import StyledTooltip, {
  StyledLearnMoreTooltip,
} from "../../../components/StyledTooltip";
import {
  solarizedLight,
  solarizedDark,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  codeBlockColor,
  codeBlockColorRgbDark,
  codeBlockColorRgbLight,
  grey,
} from "../../../themes/colors/aptosColorPalette";
import {useParams} from "react-router-dom";
import {useLogEventWithBasic} from "../hooks/useLogEventWithBasic";
import {blue} from "@mui/material/colors";
import useWdsBackend from "../../../api/hooks/useWdsBackend";
import {useGlobalState} from "../../../global-config/GlobalConfig";
import {useGetPolicies} from "../../../api/hooks/useGetPolicies";
import {
  PackageMetadata,
  InternalUpgradePolicy,
} from "../../../api/hooks/useGetAccountResource";
import GeneralTableHeaderCell from "../../../components/Table/GeneralTableHeaderCell";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export interface VerifyCheckResponse {
  chainId: string;
  account: string;
  moduleName: string;
  isVerified: boolean;
  status: string;
  internal_upgrade_number: string;
  internal_upgrade_policy: InternalUpgradePolicy;
}
export interface VerifyResponse {
  account: string;
  moduleName: string;
  requestedTime: number;
  isVerified: boolean;
  byteCode: number;
  onChainByteCode: string;
  offChainByteCode: string;
  internal_upgrade_number: string;
  internal_upgrade_policy: InternalUpgradePolicy;
}

export interface CodeProps {
  bytecode: string;
  sortedPackages?: PackageMetadata[];
}

function useStartingLineNumber(sourceCode?: string) {
  const functionToHighlight = useParams().selectedFnName;

  if (!sourceCode) return 0;
  if (!functionToHighlight) return 0;

  return getPublicFunctionLineNumber(sourceCode, functionToHighlight);
}

function ExpandCode({sourceCode}: {sourceCode: string | undefined}) {
  const theme = useTheme();
  const {selectedModuleName} = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logEvent = useLogEventWithBasic();

  const handleOpenModal = () => {
    logEvent("expand_button_clicked", selectedModuleName);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const startingLineNumber = useStartingLineNumber(sourceCode);
  const codeBoxScrollRef = useRef<any>(null);
  const LINE_HEIGHT_IN_PX = 24;
  useEffect(() => {
    if (codeBoxScrollRef.current) {
      codeBoxScrollRef.current.scrollTop =
        LINE_HEIGHT_IN_PX * startingLineNumber;
    }
  });

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleOpenModal}
        disabled={!sourceCode}
        sx={{
          height: "2rem",
          width: "2rem",
          minWidth: "unset",
          borderRadius: "0.5rem",
        }}
      >
        <OpenInFull style={{height: "1.25rem", width: "1.25rem"}} />
      </Button>
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxHeight: "80%",
            width: "80%",
            overflowY: "auto",
            borderRadius: 1,
          }}
          ref={codeBoxScrollRef}
        >
          <SyntaxHighlighter
            language="rust"
            key={theme.palette.mode}
            style={
              theme.palette.mode === "light" ? solarizedLight : solarizedDark
            }
            customStyle={{
              margin: 0,
              backgroundColor:
                theme.palette.mode === "light"
                  ? codeBlockColorRgbLight
                  : codeBlockColorRgbDark,
            }}
            showLineNumbers
          >
            {sourceCode!}
          </SyntaxHighlighter>
        </Box>
      </Modal>
    </Box>
  );
}

export function Code({bytecode, sortedPackages}: CodeProps) {
  const {address, selectedModuleName, modulesTab} = useParams();
  const logEvent = useLogEventWithBasic();

  const TOOLTIP_TIME = 2000; // 2s

  const sourceCode = bytecode === "0x" ? undefined : transformCode(bytecode);

  const theme = useTheme();
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);

  const [state, _setState] = useGlobalState();
  const [verified, setVerified] = useState(false);
  const [currentNum, setCurrentNum] = useState<string | undefined>("");
  const [verifiedNum, setVerifiedNum] = useState<string | undefined>("");
  const [verifyDifferenceMsg, setVerifyDifferenceMsg] = useState<string>("");
  const [isVerifyDifference, setIsVerifyDifference] = useState(true);
  const [verifyInProgress, setVerifyInProgress] = useState(false);
  // const [verifyCheckStatus, setVerifyCheckStatus] = useState<string | null>(null);
  const wdsBack = useWdsBackend();

  // const {
  //   data: policies,
  //   isLoading,
  //   isError,
  //   isFetched,
  // } = useGetPolicies(state.network_name, address);

  const selectedPackage = sortedPackages?.find((sortedPackage) => {
    return sortedPackage.modules.find((module) => {
      return module.name === selectedModuleName;
    });
  });
  console.log(modulesTab, sortedPackages);

  async function copyCode(event: React.MouseEvent<HTMLButtonElement>) {
    if (!sourceCode) return;

    await navigator.clipboard.writeText(sourceCode);
    setTooltipOpen(true);
    setTimeout(() => {
      setTooltipOpen(false);
    }, TOOLTIP_TIME);
  }

  const startingLineNumber = useStartingLineNumber(sourceCode);
  const codeBoxScrollRef = useRef<any>(null);
  const LINE_HEIGHT_IN_PX = 24;
  useEffect(() => {
    if (codeBoxScrollRef.current) {
      codeBoxScrollRef.current.scrollTop =
        LINE_HEIGHT_IN_PX * startingLineNumber;
    }
    setCurrentNum(selectedPackage?.upgrade_number);

    const query = `chainId=${state.network_name}&account=${address}&moduleName=${selectedModuleName}`;
    wdsBack("verification/aptos/verify-check", query).then((res) => {
      const verifyCheck = res as VerifyCheckResponse;
      console.log("verifyCheck", verifyCheck);
      // console.log('verifyCheck.status', verifyCheck.status);
      if (verifyCheck.status === "VERIFIED_DIFFERENT") {
        setVerifyDifferenceMsg(
          "❗️ Warning: This code is different to the real code on blockchain.",
        );
        setIsVerifyDifference(true);
      } else {
        setVerifyDifferenceMsg("");
        setIsVerifyDifference(false);
      }
      setVerified(verifyCheck.isVerified);
      setVerifiedNum(verifyCheck.internal_upgrade_number);
      // setVerifyCheckStatus(verifyCheck.status);
    });
  });

  // if (isLoading) {
  //   return null;
  // }

  const verifyClick = () => {
    setVerifyInProgress(true);
    const timestamp = new Date().getTime().toString();
    const query = `chainId=${state.network_name}&account=${address}&moduleName=${selectedModuleName}&timestamp=${timestamp}`;
    wdsBack("verification/aptos", query, "load")
      .then((res) => {
        setVerifyInProgress(false);
        const verify = res as VerifyResponse;
        setVerified(verify.isVerified);
        console.log("verify", verify);
        // if (verify.onChainByteCode !== verify.offChainByteCode) {
        //
        // }
      })
      .catch((err) => {
        console.log("verification/aptos Err", err);
        setVerifyInProgress(false);
      });
  };

  return (
    <Box>
      <Stack
        direction="row"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Stack
          direction="row"
          spacing={1}
          marginY={"16px"}
          alignItems={"center"}
        >
          <Typography fontSize={20} fontWeight={700}>
            Code
          </Typography>
          {verified ? (
            <StyledTooltip
              placement="bottom-start"
              title={
                <Stack alignItems="flex-end">
                  <Typography variant="inherit">
                    This code is verified. So it is exactly the same as the real
                    code on blockchain.
                  </Typography>
                </Stack>
              }
            >
              <span style={{cursor: "default"}}>✅</span>
            </StyledTooltip>
          ) : (
            <StyledLearnMoreTooltip text="Please be aware that this code was provided by the owner and it could be different to the real code on blockchain. We can not not verify it." />
          )}

          {/*<Typography
              fontSize={20}
              fontWeight={700}
              marginLeft={"16px"}
              color={theme.palette.mode === "dark" ? blue[400] : blue[600]}
          >
              Verify
          </Typography>*/}
          <span style={{marginLeft: "15px"}}>
            <Button
              type="submit"
              disabled={verifyInProgress || verified || isVerifyDifference}
              variant="contained"
              sx={{width: "8rem", height: "3rem"}}
              onClick={verifyClick}
            >
              {verifyInProgress ? (
                <CircularProgress size={30}></CircularProgress>
              ) : verified ? (
                "Verified"
              ) : (
                "Verify"
              )}
            </Button>
          </span>
          <Stack
            direction="row"
            spacing={1}
            marginY={"16px"}
            height={"44px"}
            alignItems={"flex-end"}
          >
            <span style={{marginLeft: "15px"}}>
              <Typography fontSize={12}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  upgrade_number
                </div>
                <span style={{fontWeight: "bold"}}>
                  verified:
                  <span
                    style={{
                      color: theme.palette.mode === "dark" ? "skyblue" : "blue",
                    }}
                  >
                    {" "}
                    {!verifiedNum ? "Not yet" : verifiedNum}{" "}
                    {/*|| (verifiedNum === '0' && verifyCheckStatus === null)*/}
                  </span>
                </span>
                <span style={{marginLeft: "20px", fontWeight: "bold"}}>
                  Current:
                  <span style={{color: "red"}}> {currentNum}</span>
                </span>
              </Typography>
            </span>
          </Stack>
        </Stack>
        {sourceCode && (
          <Stack direction="row" spacing={2}>
            <StyledTooltip
              title="Code copied"
              placement="right"
              open={tooltipOpen}
              disableFocusListener
              disableHoverListener
              disableTouchListener
            >
              <Button
                variant="outlined"
                onClick={(source) => {
                  logEvent("copy_code_button_clicked", selectedModuleName);
                  copyCode(source);
                }}
                disabled={!sourceCode}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  height: "2rem",
                  borderRadius: "0.5rem",
                }}
              >
                <ContentCopy style={{height: "1.25rem", width: "1.25rem"}} />
                <Typography
                  marginLeft={1}
                  sx={{
                    display: "inline",
                    whiteSpace: "nowrap",
                  }}
                >
                  copy code
                </Typography>
              </Button>
            </StyledTooltip>
            <ExpandCode sourceCode={sourceCode} />
          </Stack>
        )}
      </Stack>
      {sourceCode &&
        (verified ? null : (
          <>
            {verifyDifferenceMsg ? (
              <Typography
                marginBottom={"16px"}
                color={theme.palette.mode === "dark" ? "red" : "#e60000"}
              >
                {verifyDifferenceMsg}
              </Typography>
            ) : (
              <Typography
                variant="body1"
                fontSize={14}
                fontWeight={400}
                marginBottom={"16px"}
                color={theme.palette.mode === "dark" ? grey[400] : grey[600]}
              >
                The source code is plain text uploaded by the deployer, which
                can be different from the actual bytecode.
              </Typography>
            )}
          </>
        ))}
      {!sourceCode ? (
        <Box>
          Unfortunately, the source code cannot be shown because the package
          publisher has chosen not to make it available
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: "100vh",
            overflow: "auto",
            borderRadius: 1,
            backgroundColor: codeBlockColor,
          }}
          ref={codeBoxScrollRef}
        >
          <SyntaxHighlighter
            language="rust"
            key={theme.palette.mode}
            style={
              theme.palette.mode === "light" ? solarizedLight : solarizedDark
            }
            customStyle={{margin: 0, backgroundColor: "unset"}}
            showLineNumbers
          >
            {sourceCode}
          </SyntaxHighlighter>
        </Box>
      )}
    </Box>
  );
}
